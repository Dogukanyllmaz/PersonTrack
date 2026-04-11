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
public class TagsController : ControllerBase
{
    private readonly AppDbContext _db;
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public TagsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tags = await _db.Tags
            .Select(t => new { t.Id, t.Name, t.Color,
                PersonCount = t.PersonTags.Count,
                MeetingCount = t.MeetingTags.Count })
            .OrderBy(t => t.Name)
            .ToListAsync();
        return Ok(tags);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] TagRequest req)
    {
        if (await _db.Tags.AnyAsync(t => t.Name == req.Name))
            return BadRequest(new { message = "Bu isimde etiket zaten var." });

        var tag = new Tag { Name = req.Name, Color = req.Color ?? "#6366f1", CreatedById = CurrentUserId };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync();
        return Ok(new { tag.Id, tag.Name, tag.Color });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var tag = await _db.Tags.FindAsync(id);
        if (tag == null) return NotFound();
        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Person tags
    [HttpPost("persons/{personId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AddToPerson(int personId, [FromBody] int tagId)
    {
        if (!await _db.Persons.AnyAsync(p => p.Id == personId)) return NotFound();
        if (!await _db.Tags.AnyAsync(t => t.Id == tagId)) return NotFound();
        if (await _db.PersonTags.AnyAsync(pt => pt.PersonId == personId && pt.TagId == tagId))
            return Ok();

        _db.PersonTags.Add(new PersonTag { PersonId = personId, TagId = tagId });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("persons/{personId}/{tagId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RemoveFromPerson(int personId, int tagId)
    {
        var pt = await _db.PersonTags.FindAsync(personId, tagId);
        if (pt == null) return NotFound();
        _db.PersonTags.Remove(pt);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Meeting tags
    [HttpPost("meetings/{meetingId}")]
    public async Task<IActionResult> AddToMeeting(int meetingId, [FromBody] int tagId)
    {
        if (!await _db.Meetings.AnyAsync(m => m.Id == meetingId)) return NotFound();
        if (!await _db.Tags.AnyAsync(t => t.Id == tagId)) return NotFound();
        if (await _db.MeetingTags.AnyAsync(mt => mt.MeetingId == meetingId && mt.TagId == tagId))
            return Ok();

        _db.MeetingTags.Add(new MeetingTag { MeetingId = meetingId, TagId = tagId });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("meetings/{meetingId}/{tagId}")]
    public async Task<IActionResult> RemoveFromMeeting(int meetingId, int tagId)
    {
        var mt = await _db.MeetingTags.FindAsync(meetingId, tagId);
        if (mt == null) return NotFound();
        _db.MeetingTags.Remove(mt);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record TagRequest(string Name, string? Color);
