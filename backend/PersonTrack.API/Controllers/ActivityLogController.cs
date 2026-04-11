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
        [FromQuery] int? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.ActivityLogs
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (userId.HasValue) q = q.Where(a => a.UserId == userId.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new {
                a.Id, a.EntityType, a.EntityId, a.EntityName, a.Action, a.Details, a.CreatedAt,
                UserName = a.User != null ? a.User.Username : "?"
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }
}
