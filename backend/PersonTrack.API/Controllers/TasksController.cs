using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.DTOs;
using PersonTrack.API.Models;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db) => _db = db;

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
    public async Task<IActionResult> GetAll([FromQuery] int? personId, [FromQuery] string? status)
    {
        var query = _db.PersonTasks
            .Include(t => t.Person)
            .AsQueryable();

        // Normal kullanıcı: sadece kendi kişisine atanmış görevler
        if (!IsPrivileged)
        {
            var pid = CurrentPersonId;
            if (!pid.HasValue)
                return Ok(Array.Empty<object>()); // PersonId bağlı değilse boş döndür
            query = query.Where(t => t.PersonId == pid.Value);
        }
        else
        {
            if (personId.HasValue)
                query = query.Where(t => t.PersonId == personId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        var tasks = await query.OrderByDescending(t => t.AssignedDate).ToListAsync();
        return Ok(tasks.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var task = await _db.PersonTasks
            .Include(t => t.Person)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound();
        return Ok(MapToResponse(task));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] TaskCreateRequest req)
    {
        if (!await _db.Persons.AnyAsync(p => p.Id == req.PersonId))
            return BadRequest(new { message = "Kişi bulunamadı." });

        var task = new PersonTask
        {
            PersonId = req.PersonId,
            Title = req.Title,
            Description = req.Description,
            AssignedDate = req.AssignedDate,
            Status = "Active",
            CreatedById = CurrentUserId
        };
        _db.PersonTasks.Add(task);
        await _db.SaveChangesAsync();
        await _db.Entry(task).Reference(t => t.Person).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, MapToResponse(task));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] TaskUpdateRequest req)
    {
        var task = await _db.PersonTasks.FindAsync(id);
        if (task == null) return NotFound();

        task.Title = req.Title;
        task.Description = req.Description;
        task.Status = req.Status;
        task.AssignedDate = req.AssignedDate;
        task.CompletedDate = req.CompletedDate;
        await _db.SaveChangesAsync();
        await _db.Entry(task).Reference(t => t.Person).LoadAsync();
        return Ok(MapToResponse(task));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var task = await _db.PersonTasks.FindAsync(id);
        if (task == null) return NotFound();
        task.Status = "Completed";
        task.CompletedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { task.Id, task.Status, task.CompletedDate });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.PersonTasks.FindAsync(id);
        if (task == null) return NotFound();
        _db.PersonTasks.Remove(task);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static TaskResponse MapToResponse(PersonTask t) => new()
    {
        Id = t.Id,
        PersonId = t.PersonId,
        PersonName = t.Person != null ? $"{t.Person.FirstName} {t.Person.LastName}" : "",
        Title = t.Title,
        Description = t.Description,
        Status = t.Status,
        AssignedDate = t.AssignedDate,
        CompletedDate = t.CompletedDate,
        CreatedAt = t.CreatedAt
    };
}
