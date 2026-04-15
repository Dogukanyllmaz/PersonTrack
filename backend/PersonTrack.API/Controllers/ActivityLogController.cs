using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ActivityLogController : ControllerBase
{
    private readonly AppDbContext _db;

    public ActivityLogController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] int?    userId,
        [FromQuery] string? search,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.ActivityLogs
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (!string.IsNullOrEmpty(action))     q = q.Where(a => a.Action == action);
        if (userId.HasValue)                   q = q.Where(a => a.UserId == userId.Value);
        if (from.HasValue)                     q = q.Where(a => a.CreatedAt >= from.Value.ToUniversalTime());
        if (to.HasValue)                       q = q.Where(a => a.CreatedAt <= to.Value.ToUniversalTime().AddDays(1));
        if (!string.IsNullOrEmpty(search))
            q = q.Where(a =>
                a.EntityName.Contains(search) ||
                (a.Details != null && a.Details.Contains(search)) ||
                (a.User != null && a.User.Username.Contains(search)));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.EntityType,
                a.EntityId,
                a.EntityName,
                a.Action,
                a.Details,
                a.IpAddress,
                a.UserAgent,
                a.CreatedAt,
                UserName  = a.User != null ? a.User.Username : "?",
                UserEmail = a.User != null ? a.User.Email    : "?",
                UserRole  = a.User != null ? a.User.Role     : "?"
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>Özet istatistikler — dashboard widget için</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int days = 7)
    {
        var since = DateTime.UtcNow.AddDays(-days);

        var total        = await _db.ActivityLogs.CountAsync(a => a.CreatedAt >= since);
        var byAction     = await _db.ActivityLogs
            .Where(a => a.CreatedAt >= since)
            .GroupBy(a => a.Action)
            .Select(g => new { action = g.Key, count = g.Count() })
            .ToListAsync();

        var byEntityType = await _db.ActivityLogs
            .Where(a => a.CreatedAt >= since)
            .GroupBy(a => a.EntityType)
            .Select(g => new { entityType = g.Key, count = g.Count() })
            .ToListAsync();

        var topUsers = await _db.ActivityLogs
            .Include(a => a.User)
            .Where(a => a.CreatedAt >= since)
            .GroupBy(a => new { a.UserId, UserName = a.User != null ? a.User.Username : "?" })
            .Select(g => new { g.Key.UserId, g.Key.UserName, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync();

        var recentCritical = await _db.ActivityLogs
            .Include(a => a.User)
            .Where(a => a.CreatedAt >= since && (
                a.Action == "Delete" || a.Action == "SetUserRole" ||
                a.Action == "ToggleUserActive" || a.Action == "ChangePassword"))
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new
            {
                a.Id, a.EntityType, a.EntityName, a.Action, a.CreatedAt, a.IpAddress,
                UserName = a.User != null ? a.User.Username : "?"
            })
            .ToListAsync();

        return Ok(new { total, days, byAction, byEntityType, topUsers, recentCritical });
    }

    /// <summary>Kullanıcı listesi — filter dropdown için</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .Where(u => u.IsActive)
            .OrderBy(u => u.Username)
            .Select(u => new { u.Id, u.Username, u.Email, u.Role })
            .ToListAsync();
        return Ok(users);
    }
}
