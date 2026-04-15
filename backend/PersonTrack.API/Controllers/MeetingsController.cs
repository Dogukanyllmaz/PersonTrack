using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.DTOs;
using PersonTrack.API.Helpers;
using PersonTrack.API.Models;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MeetingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public MeetingsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "User";

    private int? CurrentPersonId
    {
        get
        {
            var v = User.FindFirstValue("PersonId");
            return v != null ? int.Parse(v) : null;
        }
    }

    private bool IsPrivileged => CurrentRole == "Admin" || CurrentRole == "Manager";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = _db.Meetings
            .Include(m => m.Participants).ThenInclude(p => p.Person)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(m => m.Status == status);

        // Normal kullanıcı: sadece kendi oluşturduğu veya katılımcı olduğu toplantılar
        if (!IsPrivileged)
        {
            var uid = CurrentUserId;
            var pid = CurrentPersonId;
            query = query.Where(m =>
                m.CreatedById == uid ||
                (pid.HasValue && m.Participants.Any(p => p.PersonId == pid.Value)));
        }

        var meetings = await query.OrderByDescending(m => m.MeetingDate).ToListAsync();
        return Ok(meetings.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var meeting = await _db.Meetings
            .Include(m => m.Participants).ThenInclude(p => p.Person)
            .Include(m => m.Notes).ThenInclude(n => n.Person)
            .Include(m => m.Documents).ThenInclude(d => d.UploadedBy)
            .Include(m => m.LinksAsSource).ThenInclude(l => l.LinkedMeeting)
            .Include(m => m.LinksAsTarget).ThenInclude(l => l.Meeting)
            .Include(m => m.Tags).ThenInclude(mt => mt.Tag)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (meeting == null) return NotFound();

        // Normal kullanıcı erişim kontrolü
        if (!IsPrivileged)
        {
            var uid = CurrentUserId;
            var pid = CurrentPersonId;
            var hasAccess = meeting.CreatedById == uid ||
                            (pid.HasValue && meeting.Participants.Any(p => p.PersonId == pid.Value));
            if (!hasAccess) return Forbid();
        }

        return Ok(MapToDetailResponse(meeting));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MeetingCreateRequest req)
    {
        var meeting = new Meeting
        {
            Title = req.Title,
            Content = req.Content,
            MeetingDate = req.MeetingDate,
            Status = "Planned",
            CreatedById = CurrentUserId
        };

        foreach (var personId in req.ParticipantIds.Distinct())
        {
            if (await _db.Persons.AnyAsync(p => p.Id == personId))
                meeting.Participants.Add(new MeetingParticipant { PersonId = personId });
        }

        _db.Meetings.Add(meeting);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = meeting.Id }, MapToResponse(meeting));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] MeetingUpdateRequest req)
    {
        var meeting = await _db.Meetings
            .Include(m => m.Participants)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (meeting == null) return NotFound();

        meeting.Title = req.Title;
        meeting.Content = req.Content;
        meeting.MeetingDate = req.MeetingDate;

        _db.MeetingParticipants.RemoveRange(meeting.Participants);
        foreach (var personId in req.ParticipantIds.Distinct())
        {
            if (await _db.Persons.AnyAsync(p => p.Id == personId))
                meeting.Participants.Add(new MeetingParticipant { PersonId = personId });
        }

        await _db.SaveChangesAsync();
        return Ok(MapToResponse(meeting));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var meeting = await _db.Meetings.FindAsync(id);
        if (meeting == null) return NotFound();
        meeting.Status = "Completed";
        await _db.SaveChangesAsync();
        return Ok(new { meeting.Id, meeting.Status });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var meeting = await _db.Meetings
            .Include(m => m.Documents)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (meeting == null) return NotFound();

        foreach (var doc in meeting.Documents)
            DeletePhysicalFile(id, doc.StoredFileName);

        _db.Meetings.Remove(meeting);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Notes ──────────────────────────────────────────────────────────
    [HttpGet("{id}/notes")]
    public async Task<IActionResult> GetNotes(int id)
    {
        var notes = await _db.MeetingNotes
            .Include(n => n.Person)
            .Where(n => n.MeetingId == id)
            .OrderBy(n => n.OrderIndex)
            .ToListAsync();
        return Ok(notes.Select(MapNoteToResponse));
    }

    [HttpPost("{id}/notes")]
    public async Task<IActionResult> AddNote(int id, [FromBody] MeetingNoteCreateRequest req)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == id)) return NotFound();

        TimeSpan? marker = null;
        if (!string.IsNullOrWhiteSpace(req.MinuteMarker) && TimeSpan.TryParse(req.MinuteMarker, out var ts))
            marker = ts;

        var note = new MeetingNote
        {
            MeetingId = id,
            PersonId = req.PersonId,
            Content = req.Content,
            MinuteMarker = marker,
            OrderIndex = req.OrderIndex
        };
        _db.MeetingNotes.Add(note);
        await _db.SaveChangesAsync();

        await _db.Entry(note).Reference(n => n.Person).LoadAsync();
        return Ok(MapNoteToResponse(note));
    }

    [HttpDelete("{id}/notes/{noteId}")]
    public async Task<IActionResult> DeleteNote(int id, int noteId)
    {
        var note = await _db.MeetingNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.MeetingId == id);
        if (note == null) return NotFound();
        _db.MeetingNotes.Remove(note);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Parse an Excel file and return preview rows with person name matches — nothing is saved.
    /// </summary>
    [HttpPost("{id}/notes/preview")]
    public async Task<IActionResult> PreviewNotes(int id, IFormFile file)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == id)) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya boş." });

        using var stream = file.OpenReadStream();
        List<string[]> excelRows;
        try { excelRows = ExcelHelper.ReadXlsx(stream); }
        catch { return BadRequest(new { message = "Geçersiz Excel dosyası." }); }

        var allPersons = await _db.Persons
            .Select(p => new { p.Id, p.FirstName, p.LastName })
            .ToListAsync();

        var preview = new List<object>();

        for (int i = 0; i < excelRows.Count; i++)
        {
            var row = excelRows[i];
            var rawName = (row.Length > 0 ? row[0] : "")?.Trim() ?? "";
            var content = (row.Length > 1 ? row[1] : "")?.Trim() ?? "";
            var minuteMarker = (row.Length > 2 ? row[2] : "")?.Trim() ?? "";

            var matches = new List<object>();
            if (!string.IsNullOrWhiteSpace(rawName))
            {
                // Exact full-name match first
                var exact = allPersons
                    .Where(p => $"{p.FirstName} {p.LastName}"
                        .Equals(rawName, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (exact.Count > 0)
                {
                    matches = exact.Select(p => (object)new
                    {
                        id = p.Id,
                        fullName = $"{p.FirstName} {p.LastName}"
                    }).ToList();
                }
                else
                {
                    // Fuzzy: all search words present anywhere in full name
                    var parts = rawName.ToLower()
                        .Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    matches = allPersons
                        .Where(p =>
                        {
                            var full = $"{p.FirstName} {p.LastName}".ToLower();
                            return parts.All(part => full.Contains(part));
                        })
                        .Select(p => (object)new
                        {
                            id = p.Id,
                            fullName = $"{p.FirstName} {p.LastName}"
                        }).ToList();
                }
            }

            preview.Add(new
            {
                rowNumber = i + 2,
                rawName,
                content,
                minuteMarker,
                matches,
                // Auto-resolve when exactly 1 match
                resolvedPersonId = matches.Count == 1
                    ? (int?)((dynamic)matches[0]).id
                    : null
            });
        }

        return Ok(new { rows = preview });
    }

    /// <summary>
    /// Save pre-reviewed import rows (with resolved personIds) to the database.
    /// </summary>
    [HttpPost("{id}/notes/import-confirmed")]
    public async Task<IActionResult> ImportConfirmed(int id,
        [FromBody] List<ConfirmedNoteRowDto> rows)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == id)) return NotFound();
        if (rows == null || rows.Count == 0)
            return BadRequest(new { message = "Kaydedilecek satır yok." });

        var currentCount = await _db.MeetingNotes.CountAsync(n => n.MeetingId == id);

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            if (string.IsNullOrWhiteSpace(row.Content)) continue;

            TimeSpan? marker = null;
            if (!string.IsNullOrWhiteSpace(row.MinuteMarker) &&
                TimeSpan.TryParse(row.MinuteMarker, out var ts))
                marker = ts;

            _db.MeetingNotes.Add(new MeetingNote
            {
                MeetingId = id,
                PersonId = row.PersonId,
                Content = row.Content,
                MinuteMarker = marker,
                OrderIndex = currentCount + i
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { added = rows.Count });
    }

    [HttpGet("notes-template")]
    public IActionResult DownloadNotesTemplate()
    {
        var headers = new[] { "Ad Soyad", "İçerik", "Dakika (HH:mm:ss)" };
        var sample = new[]
        {
            new[] { "Ahmet Yılmaz", "Toplantı açılış konuşması yapıldı.", "00:00:00" },
            new[] { "Fatma Kaya",   "Proje güncellemesi paylaşıldı.",     "00:05:30" },
            new[] { "",             "Genel not — kişi ataması yok.",       "00:10:00" },
        };
        var widths = new double[] { 28, 55, 22 };
        var bytes = ExcelHelper.CreateXlsx(headers, sample, widths);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "toplanti_not_sablonu.xlsx");
    }

    // ── Documents ──────────────────────────────────────────────────────
    [HttpPost("{id}/documents")]
    public async Task<IActionResult> UploadDocument(int id, IFormFile file)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == id)) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya boş." });

        var ext = Path.GetExtension(file.FileName);
        var stored = $"{Guid.NewGuid()}{ext}";
        var folder = GetUploadFolder(id);
        Directory.CreateDirectory(folder);

        var path = Path.Combine(folder, stored);
        await using var fs = System.IO.File.Create(path);
        await file.CopyToAsync(fs);

        var doc = new MeetingDocument
        {
            MeetingId = id,
            FileName = file.FileName,
            StoredFileName = stored,
            ContentType = file.ContentType,
            FileSize = file.Length,
            UploadedById = CurrentUserId
        };
        _db.MeetingDocuments.Add(doc);
        await _db.SaveChangesAsync();
        await _db.Entry(doc).Reference(d => d.UploadedBy).LoadAsync();
        return Ok(MapDocToResponse(doc));
    }

    [HttpGet("{id}/documents/{docId}/download")]
    public async Task<IActionResult> DownloadDocument(int id, int docId)
    {
        var doc = await _db.MeetingDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.MeetingId == id);
        if (doc == null) return NotFound();

        var path = Path.Combine(GetUploadFolder(id), doc.StoredFileName);
        if (!System.IO.File.Exists(path)) return NotFound(new { message = "Dosya bulunamadı." });

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, doc.ContentType, doc.FileName);
    }

    [HttpDelete("{id}/documents/{docId}")]
    public async Task<IActionResult> DeleteDocument(int id, int docId)
    {
        var doc = await _db.MeetingDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.MeetingId == id);
        if (doc == null) return NotFound();

        DeletePhysicalFile(id, doc.StoredFileName);
        _db.MeetingDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Meeting links ──────────────────────────────────────────────────
    [HttpPost("{id}/links")]
    public async Task<IActionResult> AddLink(int id, [FromBody] AddMeetingLinkRequest req)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == id)) return NotFound();
        var linked = await _db.Meetings.FindAsync(req.LinkedMeetingId);
        if (linked == null) return NotFound();
        if (id == req.LinkedMeetingId)
            return BadRequest(new { message = "Toplantı kendisiyle bağlanamaz." });

        var link = new MeetingLink
        {
            MeetingId = id,
            LinkedMeetingId = req.LinkedMeetingId,
            LinkType = req.LinkType
        };
        _db.MeetingLinks.Add(link);
        await _db.SaveChangesAsync();

        return Ok(new MeetingLinkResponse
        {
            Id = link.Id,
            LinkedMeetingId = linked.Id,
            LinkedMeetingTitle = linked.Title,
            LinkedMeetingDate = linked.MeetingDate,
            LinkType = link.LinkType,
            IsReverse = false
        });
    }

    [HttpDelete("{id}/links/{linkId}")]
    public async Task<IActionResult> RemoveLink(int id, int linkId)
    {
        var link = await _db.MeetingLinks
            .FirstOrDefaultAsync(l => l.Id == linkId && (l.MeetingId == id || l.LinkedMeetingId == id));
        if (link == null) return NotFound();
        _db.MeetingLinks.Remove(link);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────────
    private string GetUploadFolder(int meetingId) =>
        Path.Combine(_env.ContentRootPath, "uploads", "meetings", meetingId.ToString());

    private void DeletePhysicalFile(int meetingId, string storedFileName)
    {
        var path = Path.Combine(GetUploadFolder(meetingId), storedFileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    private static MeetingResponse MapToResponse(Meeting m) => new()
    {
        Id = m.Id,
        Title = m.Title,
        Content = m.Content,
        MeetingDate = m.MeetingDate,
        Status = m.Status,
        CreatedAt = m.CreatedAt,
        Participants = m.Participants
            .Where(p => p.Person != null)
            .Select(p => new ParticipantResponse
            {
                PersonId = p.PersonId,
                PersonName = $"{p.Person!.FirstName} {p.Person.LastName}"
            }).ToList()
    };

    private static MeetingResponse MapToDetailResponse(Meeting m)
    {
        var r = MapToResponse(m);
        r.Notes = m.Notes.OrderBy(n => n.OrderIndex).Select(MapNoteToResponse).ToList();
        r.Documents = m.Documents.OrderByDescending(d => d.UploadedAt).Select(MapDocToResponse).ToList();
        r.LinkedMeetings = m.LinksAsSource
            .Where(l => l.LinkedMeeting != null)
            .Select(l => new MeetingLinkResponse
            {
                Id = l.Id,
                LinkedMeetingId = l.LinkedMeetingId,
                LinkedMeetingTitle = l.LinkedMeeting!.Title,
                LinkedMeetingDate = l.LinkedMeeting.MeetingDate,
                LinkType = l.LinkType,
                IsReverse = false
            })
            .Concat(m.LinksAsTarget
                .Where(l => l.Meeting != null)
                .Select(l => new MeetingLinkResponse
                {
                    Id = l.Id,
                    LinkedMeetingId = l.MeetingId,
                    LinkedMeetingTitle = l.Meeting!.Title,
                    LinkedMeetingDate = l.Meeting.MeetingDate,
                    LinkType = l.LinkType,
                    IsReverse = true
                }))
            .ToList();
        r.Tags = m.Tags
            .Select(mt => new MeetingTagResponse
            {
                TagId = mt.TagId,
                Tag = mt.Tag != null ? new TagInfoResponse { Id = mt.Tag.Id, Name = mt.Tag.Name, Color = mt.Tag.Color } : null
            })
            .ToList();
        return r;
    }

    private static MeetingNoteResponse MapNoteToResponse(MeetingNote n) => new()
    {
        Id = n.Id,
        PersonId = n.PersonId,
        PersonName = n.Person != null ? $"{n.Person.FirstName} {n.Person.LastName}" : null,
        Content = n.Content,
        MinuteMarker = n.MinuteMarker?.ToString(@"hh\:mm\:ss"),
        OrderIndex = n.OrderIndex
    };

    private static MeetingDocumentResponse MapDocToResponse(MeetingDocument d) => new()
    {
        Id = d.Id,
        FileName = d.FileName,
        ContentType = d.ContentType,
        FileSize = d.FileSize,
        UploadedAt = d.UploadedAt,
        UploadedByName = d.UploadedBy?.Username ?? ""
    };
}
