using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RemindersController : ControllerBase
{
    private readonly AppDbContext _db;
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public RemindersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var items = await _db.Reminders
            .Include(r => r.Person)
            .Include(r => r.Meeting)
            .Where(r => r.CreatedById == CurrentUserId && !r.IsCompleted)
            .OrderBy(r => r.ReminderDate)
            .Select(r => new {
                r.Id, r.Title, r.Notes, r.ReminderDate, r.IsRecurring,
                r.RecurringIntervalDays, r.IsSent, r.IsCompleted, r.PersonId, r.MeetingId,
                PersonName = r.Person != null ? r.Person.FirstName + " " + r.Person.LastName : null,
                MeetingTitle = r.Meeting != null ? r.Meeting.Title : null
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ReminderRequest req)
    {
        var reminder = new Reminder
        {
            Title = req.Title,
            Notes = req.Notes,
            ReminderDate = req.ReminderDate,
            IsRecurring = req.IsRecurring,
            RecurringIntervalDays = req.RecurringIntervalDays,
            PersonId = req.PersonId,
            MeetingId = req.MeetingId,
            CreatedById = CurrentUserId
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync();
        return Ok(new { reminder.Id, reminder.Title, reminder.ReminderDate });
    }

    [HttpPut("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var r = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id && r.CreatedById == CurrentUserId);
        if (r == null) return NotFound();
        r.IsCompleted = true;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id && r.CreatedById == CurrentUserId);
        if (r == null) return NotFound();
        _db.Reminders.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record ReminderRequest(
    string Title, string? Notes, DateTime ReminderDate,
    bool IsRecurring, int? RecurringIntervalDays,
    int? PersonId, int? MeetingId);
