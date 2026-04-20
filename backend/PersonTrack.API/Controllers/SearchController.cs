using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? "User";
    private bool IsPrivileged => CurrentRole == "Admin" || CurrentRole == "Manager";

    public SearchController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { persons = Array.Empty<object>(), meetings = Array.Empty<object>(), tasks = Array.Empty<object>() });

        var lower = q.ToLower();
        var results = new List<object>();

        if (IsPrivileged)
        {
            // Persons
            var persons = await _db.Persons
                .Include(p => p.Position)
                .Where(p => p.FirstName.ToLower().Contains(lower)
                    || p.LastName.ToLower().Contains(lower)
                    || (p.Email != null && p.Email.ToLower().Contains(lower))
                    || (p.Position != null && p.Position.Name.ToLower().Contains(lower))
                    || (p.Organization != null && p.Organization.ToLower().Contains(lower)))
                .Take(5)
                .Select(p => new { type = "person", p.Id, title = p.FirstName + " " + p.LastName,
                    subtitle = p.Position.Name ?? p.Organization ?? p.Email ?? "",
                    link = "/persons/" + p.Id,
                    PhotoUrl = p.PhotoFileName != null ? "/api/persons/" + p.Id + "/photo" : null })
                .ToListAsync();
            results.AddRange(persons);

            // Tasks
            var tasks = await _db.PersonTasks
                .Include(t => t.Person)
                .Where(t => t.Title.ToLower().Contains(lower)
                    || (t.Description != null && t.Description.ToLower().Contains(lower)))
                .Take(5)
                .Select(t => new { type = "task", t.Id, title = t.Title,
                    subtitle = t.Person != null ? t.Person.FirstName + " " + t.Person.LastName : "",
                    link = "/tasks", PhotoUrl = (string?)null })
                .ToListAsync();
            results.AddRange(tasks);
        }

        // Meetings
        var meetingsQ = _db.Meetings
            .Include(m => m.Participants)
            .Where(m => m.Title.ToLower().Contains(lower)
                || (m.Content != null && m.Content.ToLower().Contains(lower)));

        if (!IsPrivileged)
        {
            var uid = CurrentUserId;
            meetingsQ = meetingsQ.Where(m => m.CreatedById == uid || m.Participants.Any(p => p.PersonId != null));
        }

        var meetings = await meetingsQ.Take(5)
            .Select(m => new { type = "meeting", m.Id, title = m.Title,
                subtitle = m.MeetingDate.ToString("dd.MM.yyyy"),
                link = "/meetings/" + m.Id, PhotoUrl = (string?)null })
            .ToListAsync();
        results.AddRange(meetings);

        return Ok(results.Take(15));
    }
}
