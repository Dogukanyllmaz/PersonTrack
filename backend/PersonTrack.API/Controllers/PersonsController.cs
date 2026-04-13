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
[Authorize(Roles = "Admin,Manager")]
public class PersonsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public PersonsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = _db.Persons
            .Include(p => p.RelationshipsAsSource).ThenInclude(r => r.RelatedPerson)
            .Include(p => p.RelationshipsAsTarget).ThenInclude(r => r.Person)
            .Include(p => p.Documents).ThenInclude(d => d.UploadedBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            query = query.Where(p =>
                p.FirstName.ToLower().Contains(search) ||
                p.LastName.ToLower().Contains(search) ||
                (p.Email != null && p.Email.ToLower().Contains(search)) ||
                (p.Phone != null && p.Phone.Contains(search)) ||
                (p.CurrentPosition != null && p.CurrentPosition.ToLower().Contains(search)) ||
                (p.Organization != null && p.Organization.ToLower().Contains(search)));
        }

        var persons = await query.OrderBy(p => p.LastName).ThenBy(p => p.FirstName).ToListAsync();
        return Ok(persons.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var person = await _db.Persons
            .Include(p => p.RelationshipsAsSource).ThenInclude(r => r.RelatedPerson)
            .Include(p => p.RelationshipsAsTarget).ThenInclude(r => r.Person)
            .Include(p => p.Documents).ThenInclude(d => d.UploadedBy)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person == null) return NotFound();
        return Ok(MapToResponse(person));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PersonCreateRequest req)
    {
        // E-posta + şifre verilmişse, bu e-posta başka hesapta kullanılıyor mu?
        if (!string.IsNullOrWhiteSpace(req.Email) && !string.IsNullOrWhiteSpace(req.Password))
        {
            if (await _db.Users.AnyAsync(u => u.Email == req.Email))
                return BadRequest(new { message = "Bu e-posta adresi zaten başka bir kullanıcıya ait." });
        }

        var person = new Person
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Email = req.Email,
            Phone = req.Phone,
            Address = req.Address,
            Notes = req.Notes,
            CurrentPosition = req.CurrentPosition,
            Organization = req.Organization,
            BirthDate = req.BirthDate,
            CreatedById = CurrentUserId
        };
        _db.Persons.Add(person);
        await _db.SaveChangesAsync();

        // Otomatik kullanıcı hesabı oluştur
        if (!string.IsNullOrWhiteSpace(req.Email) && !string.IsNullOrWhiteSpace(req.Password))
        {
            var user = new User
            {
                Username = $"{req.FirstName} {req.LastName}",
                Email = req.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = "User",
                PersonId = person.Id
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetById), new { id = person.Id }, MapToResponse(person));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PersonUpdateRequest req)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person == null) return NotFound();

        person.FirstName = req.FirstName;
        person.LastName = req.LastName;
        person.Email = req.Email;
        person.Phone = req.Phone;
        person.Address = req.Address;
        person.Notes = req.Notes;
        person.CurrentPosition = req.CurrentPosition;
        person.Organization = req.Organization;
        person.BirthDate = req.BirthDate;
        await _db.SaveChangesAsync();
        return Ok(MapToResponse(person));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var person = await _db.Persons
            .Include(p => p.Documents)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (person == null) return NotFound();

        foreach (var doc in person.Documents)
            DeletePhysicalFile("persons", id, doc.StoredFileName);

        if (!string.IsNullOrEmpty(person.PhotoFileName))
            DeletePhysicalFile("persons", id, person.PhotoFileName);

        var participants = _db.MeetingParticipants.Where(mp => mp.PersonId == id);
        _db.MeetingParticipants.RemoveRange(participants);

        var notes = _db.MeetingNotes.Where(n => n.PersonId == id);
        await notes.ForEachAsync(n => n.PersonId = null);

        _db.Persons.Remove(person);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Relationships ──────────────────────────────────────────────────
    [HttpPost("{id}/relationships")]
    public async Task<IActionResult> AddRelationship(int id, [FromBody] AddRelationshipRequest req)
    {
        var person = await _db.Persons.FindAsync(id);
        var related = await _db.Persons.FindAsync(req.RelatedPersonId);
        if (person == null || related == null) return NotFound();

        var rel = new PersonRelationship
        {
            PersonId = id,
            RelatedPersonId = req.RelatedPersonId,
            RelationshipType = req.RelationshipType,
            Notes = req.Notes
        };
        _db.PersonRelationships.Add(rel);
        await _db.SaveChangesAsync();

        return Ok(new RelationshipResponse
        {
            Id = rel.Id,
            RelatedPersonId = rel.RelatedPersonId,
            RelatedPersonName = $"{related.FirstName} {related.LastName}",
            RelationshipType = rel.RelationshipType,
            Notes = rel.Notes,
            IsReverse = false
        });
    }

    [HttpDelete("{id}/relationships/{relId}")]
    public async Task<IActionResult> RemoveRelationship(int id, int relId)
    {
        var rel = await _db.PersonRelationships
            .FirstOrDefaultAsync(r => r.Id == relId && (r.PersonId == id || r.RelatedPersonId == id));
        if (rel == null) return NotFound();
        _db.PersonRelationships.Remove(rel);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Documents ──────────────────────────────────────────────────────
    [HttpPost("{id}/documents")]
    public async Task<IActionResult> UploadDocument(int id, IFormFile file)
    {
        if (!await _db.Persons.AnyAsync(p => p.Id == id)) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya boş." });

        var ext = Path.GetExtension(file.FileName);
        var stored = $"{Guid.NewGuid()}{ext}";
        var folder = GetUploadFolder("persons", id);
        Directory.CreateDirectory(folder);

        var path = Path.Combine(folder, stored);
        await using var fs = System.IO.File.Create(path);
        await file.CopyToAsync(fs);

        var doc = new PersonDocument
        {
            PersonId = id,
            FileName = file.FileName,
            StoredFileName = stored,
            ContentType = file.ContentType,
            FileSize = file.Length,
            UploadedById = CurrentUserId
        };
        _db.PersonDocuments.Add(doc);
        await _db.SaveChangesAsync();
        await _db.Entry(doc).Reference(d => d.UploadedBy).LoadAsync();
        return Ok(MapDocToResponse(doc));
    }

    [HttpGet("{id}/documents/{docId}/download")]
    public async Task<IActionResult> DownloadDocument(int id, int docId)
    {
        var doc = await _db.PersonDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.PersonId == id);
        if (doc == null) return NotFound();

        var path = Path.Combine(GetUploadFolder("persons", id), doc.StoredFileName);
        if (!System.IO.File.Exists(path)) return NotFound(new { message = "Dosya bulunamadı." });

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, doc.ContentType, doc.FileName);
    }

    [HttpDelete("{id}/documents/{docId}")]
    public async Task<IActionResult> DeleteDocument(int id, int docId)
    {
        var doc = await _db.PersonDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.PersonId == id);
        if (doc == null) return NotFound();

        DeletePhysicalFile("persons", id, doc.StoredFileName);
        _db.PersonDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Photo ──────────────────────────────────────────────────────────
    [HttpPost("{id}/photo")]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile file)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person == null) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya boş." });

        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowed.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Sadece resim dosyası yüklenebilir (jpg, png, webp)." });

        var folder = GetUploadFolder("persons", id);
        Directory.CreateDirectory(folder);

        // Eski fotoğrafı sil
        if (!string.IsNullOrEmpty(person.PhotoFileName))
        {
            var oldPath = Path.Combine(folder, person.PhotoFileName);
            if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
        }

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var stored = $"photo_{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(folder, stored);
        await using var fs = System.IO.File.Create(filePath);
        await file.CopyToAsync(fs);

        person.PhotoFileName = stored;
        await _db.SaveChangesAsync();

        return Ok(new { photoUrl = $"/api/persons/{id}/photo" });
    }

    [HttpDelete("{id}/photo")]
    public async Task<IActionResult> DeletePhoto(int id)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person == null) return NotFound();

        if (!string.IsNullOrEmpty(person.PhotoFileName))
        {
            var folder = GetUploadFolder("persons", id);
            var path = Path.Combine(folder, person.PhotoFileName);
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            person.PhotoFileName = null;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpGet("{id}/photo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPhoto(int id)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person == null || string.IsNullOrEmpty(person.PhotoFileName))
            return NotFound();

        var path = Path.Combine(GetUploadFolder("persons", id), person.PhotoFileName);
        if (!System.IO.File.Exists(path)) return NotFound();

        var ext = Path.GetExtension(person.PhotoFileName).ToLower();
        var mime = ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => "image/jpeg"
        };

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, mime);
    }

    // ── Excel import / template ────────────────────────────────────────
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya boş." });

        using var stream = file.OpenReadStream();
        List<string[]> rows;
        try { rows = ExcelHelper.ReadXlsx(stream); }
        catch { return BadRequest(new { message = "Geçersiz Excel dosyası." }); }

        var added = 0;
        var errors = new List<string>();

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            if (string.IsNullOrWhiteSpace(row.ElementAtOrDefault(0)))
            {
                errors.Add($"Satır {i + 2}: Ad zorunlu.");
                continue;
            }
            _db.Persons.Add(new Person
            {
                FirstName = row.ElementAtOrDefault(0) ?? "",
                LastName = row.ElementAtOrDefault(1) ?? "",
                Email = row.ElementAtOrDefault(2),
                Phone = row.ElementAtOrDefault(3),
                Address = row.ElementAtOrDefault(4),
                Notes = row.ElementAtOrDefault(5),
                CurrentPosition = row.ElementAtOrDefault(6),
                Organization = row.ElementAtOrDefault(7),
                CreatedById = CurrentUserId
            });
            added++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { added, errors });
    }

    [HttpGet("template")]
    [Authorize(Roles = "Admin")]
    public IActionResult DownloadTemplate()
    {
        var headers = new[] { "Ad", "Soyad", "Email", "Telefon", "Adres", "Notlar", "Görev/Unvan", "Kurum" };
        var sample = new[] { new[] { "Ahmet", "Yılmaz", "ahmet@example.com", "05551234567", "İstanbul", "", "Müdür", "ABC A.Ş." } };
        var bytes = ExcelHelper.CreateXlsx(headers, sample);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "kisi_sablonu.xlsx");
    }

    // ── Helpers ────────────────────────────────────────────────────────
    private string GetUploadFolder(string category, int id) =>
        Path.Combine(_env.ContentRootPath, "uploads", category, id.ToString());

    private void DeletePhysicalFile(string category, int id, string storedFileName)
    {
        var path = Path.Combine(GetUploadFolder(category, id), storedFileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    private static PersonResponse MapToResponse(Person p) => new()
    {
        Id = p.Id,
        FirstName = p.FirstName,
        LastName = p.LastName,
        Email = p.Email,
        Phone = p.Phone,
        Address = p.Address,
        Notes = p.Notes,
        CurrentPosition = p.CurrentPosition,
        Organization = p.Organization,
        PhotoUrl = string.IsNullOrEmpty(p.PhotoFileName) ? null : $"/api/persons/{p.Id}/photo",
        BirthDate = p.BirthDate,
        Age = p.BirthDate.HasValue ? CalculateAge(p.BirthDate.Value) : null,
        CreatedAt = p.CreatedAt,
        Relationships = p.RelationshipsAsSource
            .Where(r => r.RelatedPerson != null)
            .Select(r => new RelationshipResponse
            {
                Id = r.Id,
                RelatedPersonId = r.RelatedPersonId,
                RelatedPersonName = $"{r.RelatedPerson!.FirstName} {r.RelatedPerson.LastName}",
                RelationshipType = r.RelationshipType,
                Notes = r.Notes,
                IsReverse = false
            })
            .Concat(p.RelationshipsAsTarget
                .Where(r => r.Person != null)
                .Select(r => new RelationshipResponse
                {
                    Id = r.Id,
                    RelatedPersonId = r.PersonId,
                    RelatedPersonName = $"{r.Person!.FirstName} {r.Person.LastName}",
                    RelationshipType = r.RelationshipType + " (ters)",
                    Notes = r.Notes,
                    IsReverse = true
                }))
            .ToList(),
        Documents = p.Documents
            .OrderByDescending(d => d.UploadedAt)
            .Select(MapDocToResponse)
            .ToList(),
        Tags = p.Tags
            .Select(pt => new PersonTagResponse
            {
                TagId = pt.TagId,
                Tag = pt.Tag != null ? new TagInfoResponse { Id = pt.Tag.Id, Name = pt.Tag.Name, Color = pt.Tag.Color } : null
            })
            .ToList()
    };

    private static PersonDocumentResponse MapDocToResponse(PersonDocument d) => new()
    {
        Id = d.Id,
        FileName = d.FileName,
        ContentType = d.ContentType,
        FileSize = d.FileSize,
        UploadedAt = d.UploadedAt,
        UploadedByName = d.UploadedBy?.Username ?? ""
    };

    private static int CalculateAge(DateTime birthDate)
    {
        var today = DateTime.Today;
        var age = today.Year - birthDate.Year;
        if (birthDate.Date > today.AddYears(-age)) age--;
        return age;
    }

    // ── Upcoming Birthdays ─────────────────────────────────────────────
    [HttpGet("birthdays")]
    public async Task<IActionResult> GetUpcomingBirthdays([FromQuery] int days = 30)
    {
        var persons = await _db.Persons
            .Where(p => p.BirthDate.HasValue)
            .ToListAsync();

        var today = DateTime.Today;
        var result = persons
            .Select(p =>
            {
                var bd = p.BirthDate!.Value;
                var thisYear = new DateTime(today.Year, bd.Month, bd.Day);
                if (thisYear < today) thisYear = thisYear.AddYears(1);
                var daysUntil = (thisYear - today).Days;
                return new
                {
                    p.Id,
                    FullName = $"{p.FirstName} {p.LastName}",
                    p.Email,
                    p.Phone,
                    PhotoUrl = string.IsNullOrEmpty(p.PhotoFileName) ? null : $"/api/persons/{p.Id}/photo",
                    BirthDate = p.BirthDate,
                    Age = CalculateAge(bd) + (thisYear.Year > today.Year ? 1 : 0),
                    DaysUntil = daysUntil,
                    IsToday = daysUntil == 0
                };
            })
            .Where(x => x.DaysUntil <= days)
            .OrderBy(x => x.DaysUntil)
            .ToList();

        return Ok(result);
    }
}
