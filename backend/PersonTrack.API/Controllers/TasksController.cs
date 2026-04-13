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
    public async Task<IActionResult> GetAll([FromQuery] int? personId, [FromQuery] string? status, [FromQuery] string? priority)
    {
        var query = _db.PersonTasks
            .Include(t => t.Person)
            .Include(t => t.Comments).ThenInclude(c => c.CreatedBy)
            .AsQueryable();

        if (!IsPrivileged)
        {
            var pid = CurrentPersonId;
            if (!pid.HasValue)
                return Ok(Array.Empty<object>());
            query = query.Where(t => t.PersonId == pid.Value);
        }
        else
        {
            if (personId.HasValue)
                query = query.Where(t => t.PersonId == personId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        if (!string.IsNullOrWhiteSpace(priority))
            query = query.Where(t => t.Priority == priority);

        var tasks = await query.OrderByDescending(t => t.AssignedDate).ToListAsync();
        return Ok(tasks.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var task = await _db.PersonTasks
            .Include(t => t.Person)
            .Include(t => t.Comments).ThenInclude(c => c.CreatedBy)
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
            DueDate = req.DueDate,
            Priority = req.Priority,
            Status = "Active",
            CreatedById = CurrentUserId
        };
        _db.PersonTasks.Add(task);
        await _db.SaveChangesAsync();
        await _db.Entry(task).Reference(t => t.Person).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, MapToResponse(task));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(int id, [FromBody] TaskUpdateRequest req)
    {
        var task = await _db.PersonTasks.FindAsync(id);
        if (task == null) return NotFound();

        task.Title = req.Title;
        task.Description = req.Description;
        task.Status = req.Status;
        task.AssignedDate = req.AssignedDate;
        task.CompletedDate = req.CompletedDate;
        task.DueDate = req.DueDate;
        task.Priority = req.Priority;
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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.PersonTasks.FindAsync(id);
        if (task == null) return NotFound();
        _db.PersonTasks.Remove(task);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Comments
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var comments = await _db.TaskComments
            .Include(c => c.CreatedBy)
            .Where(c => c.TaskId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new TaskCommentResponse
            {
                Id = c.Id,
                Content = c.Content,
                CreatedByName = c.CreatedBy != null ? c.CreatedBy.Username : "?",
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
        return Ok(comments);
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CommentRequest req)
    {
        if (!await _db.PersonTasks.AnyAsync(t => t.Id == id))
            return NotFound();

        var comment = new TaskComment
        {
            TaskId = id,
            Content = req.Text,
            CreatedById = CurrentUserId
        };
        _db.TaskComments.Add(comment);
        await _db.SaveChangesAsync();
        await _db.Entry(comment).Reference(c => c.CreatedBy).LoadAsync();

        return Ok(new TaskCommentResponse
        {
            Id = comment.Id,
            Content = comment.Content,
            CreatedByName = comment.CreatedBy?.Username ?? "?",
            CreatedAt = comment.CreatedAt
        });
    }

    [HttpDelete("{taskId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int taskId, int commentId)
    {
        var comment = await _db.TaskComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == taskId);
        if (comment == null) return NotFound();

        // Only owner or privileged can delete
        if (comment.CreatedById != CurrentUserId && !IsPrivileged)
            return Forbid();

        _db.TaskComments.Remove(comment);
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
        Priority = t.Priority,
        AssignedDate = t.AssignedDate,
        DueDate = t.DueDate,
        CompletedDate = t.CompletedDate,
        CreatedAt = t.CreatedAt,
        Comments = t.Comments?.Select(c => new TaskCommentResponse
        {
            Id = c.Id,
            Content = c.Content,
            CreatedByName = c.CreatedBy?.Username ?? "?",
            CreatedAt = c.CreatedAt
        }).ToList() ?? new()
    };
}

public record CommentRequest(string Text);
