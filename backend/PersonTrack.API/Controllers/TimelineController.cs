using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimelineController : ControllerBase
{
    private readonly AppDbContext _db;

    public TimelineController(AppDbContext db) => _db = db;

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
    public async Task<IActionResult> GetTimeline(
        [FromQuery] int? personId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? types)
    {
        // Normal kullanıcı sadece kendi zaman tünelini görebilir
        if (!IsPrivileged)
            personId = CurrentPersonId;
        var filterTypes = types?.Split(',').Select(t => t.Trim().ToLower()).ToHashSet()
                          ?? new HashSet<string> { "meeting", "task", "note", "relationship" };

        var fromDate = from ?? DateTime.UtcNow.AddYears(-5);
        var toDate = to ?? DateTime.UtcNow.AddDays(365);

        var events = new List<TimelineEvent>();

        // Meeting events
        if (filterTypes.Contains("meeting"))
        {
            var q = _db.Meetings
                .Include(m => m.Participants)
                .Where(m => m.MeetingDate >= fromDate && m.MeetingDate <= toDate);

            if (personId.HasValue)
                q = q.Where(m => m.Participants.Any(p => p.PersonId == personId.Value));

            var meetings = await q.ToListAsync();
            events.AddRange(meetings.Select(m => new TimelineEvent
            {
                Id = m.Id,
                Type = "meeting",
                Title = m.Title,
                Description = m.Content,
                Date = m.MeetingDate,
                Status = m.Status,
                PersonIds = m.Participants.Select(p => p.PersonId).ToList()
            }));
        }

        // Task events — use CreatedAt as the primary timeline date
        if (filterTypes.Contains("task"))
        {
            var q = _db.PersonTasks
                .Include(t => t.Person)
                .Where(t => t.CreatedAt >= fromDate && t.CreatedAt <= toDate);

            if (personId.HasValue)
                q = q.Where(t => t.PersonId == personId.Value);

            var tasks = await q.ToListAsync();
            events.AddRange(tasks.Select(t => new TimelineEvent
            {
                Id = t.Id,
                Type = "task",
                Title = t.Title,
                Description = t.Description,
                Date = t.CreatedAt,
                EndDate = t.CompletedDate,
                Status = t.Status,
                AssignedDate = t.AssignedDate,
                PersonIds = new List<int> { t.PersonId },
                PersonName = t.Person != null ? $"{t.Person.FirstName} {t.Person.LastName}" : null
            }));
        }

        // Meeting note events
        if (filterTypes.Contains("note"))
        {
            var q = _db.MeetingNotes
                .Include(n => n.Meeting)
                .Include(n => n.Person)
                .Where(n => n.CreatedAt >= fromDate && n.CreatedAt <= toDate);

            if (personId.HasValue)
                q = q.Where(n => n.PersonId == personId.Value);

            var notes = await q.ToListAsync();
            events.AddRange(notes.Select(n => new TimelineEvent
            {
                Id = n.Id,
                Type = "note",
                Title = $"Toplantı Notu: {n.Meeting?.Title ?? ""}",
                Description = n.Content,
                Date = n.CreatedAt,
                Status = null,
                PersonIds = n.PersonId.HasValue ? new List<int> { n.PersonId.Value } : new List<int>(),
                PersonName = n.Person != null ? $"{n.Person.FirstName} {n.Person.LastName}" : null,
                MeetingId = n.MeetingId
            }));
        }

        // Relationship events
        if (filterTypes.Contains("relationship"))
        {
            var q = _db.PersonRelationships
                .Include(r => r.Person)
                .Include(r => r.RelatedPerson)
                .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate);

            if (personId.HasValue)
                q = q.Where(r => r.PersonId == personId.Value || r.RelatedPersonId == personId.Value);

            var rels = await q.ToListAsync();
            events.AddRange(rels.Select(r => new TimelineEvent
            {
                Id = r.Id,
                Type = "relationship",
                Title = $"İlişki: {r.RelationshipType}",
                Description = $"{r.Person?.FirstName} {r.Person?.LastName} ↔ {r.RelatedPerson?.FirstName} {r.RelatedPerson?.LastName}" +
                              (r.Notes != null ? $" ({r.Notes})" : ""),
                Date = r.CreatedAt,
                Status = null,
                PersonIds = new List<int> { r.PersonId, r.RelatedPersonId },
                PersonName = r.Person != null ? $"{r.Person.FirstName} {r.Person.LastName}" : null
            }));
        }

        var sorted = events.OrderByDescending(e => e.Date).ToList();
        return Ok(sorted);
    }

    private class TimelineEvent
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime Date { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? AssignedDate { get; set; }
        public string? Status { get; set; }
        public List<int> PersonIds { get; set; } = new();
        public string? PersonName { get; set; }
        public int? MeetingId { get; set; }
    }
}
