using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _db;

    public SystemController(AppDbContext db) => _db = db;

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var proc = Process.GetCurrentProcess();
        proc.Refresh();

        var startTime  = proc.StartTime.ToUniversalTime();
        var uptime     = DateTime.UtcNow - startTime;
        var memMb      = Math.Round(proc.WorkingSet64     / 1024.0 / 1024.0, 1);
        var gcHeapMb   = Math.Round(GC.GetTotalMemory(false) / 1024.0 / 1024.0, 1);

        // DB counts — sequential (EF Core DbContext is not thread-safe)
        var users         = await _db.Users.CountAsync();
        var activeUsers   = await _db.Users.CountAsync(u => u.IsActive);
        var persons       = await _db.Persons.CountAsync();
        var meetings      = await _db.Meetings.CountAsync();
        var tasks         = await _db.PersonTasks.CountAsync();
        var messages      = await _db.Messages.CountAsync(m => !m.IsDeleted);
        var conversations  = await _db.Conversations.CountAsync();
        var unreadNotifs  = await _db.Notifications.CountAsync(n => !n.IsRead);
        var logs          = await _db.ActivityLogs.CountAsync();
        var logs24h       = await _db.ActivityLogs.CountAsync(a => a.CreatedAt >= DateTime.UtcNow.AddHours(-24));
        var logs7d        = await _db.ActivityLogs.CountAsync(a => a.CreatedAt >= DateTime.UtcNow.AddDays(-7));

        // Recent critical actions from activity log
        var recentErrors = await _db.ActivityLogs
            .Where(a => a.Action == "Delete" || a.Action == "SetUserRole")
            .OrderByDescending(a => a.CreatedAt)
            .Take(5)
            .Select(a => new { a.Action, a.EntityName, a.EntityType, a.CreatedAt })
            .ToListAsync();

        return Ok(new
        {
            status = "Healthy",
            serverTime = DateTime.UtcNow,
            uptime = new
            {
                days    = (int)uptime.TotalDays,
                hours   = uptime.Hours,
                minutes = uptime.Minutes,
                display = $"{(int)uptime.TotalDays}g {uptime.Hours}s {uptime.Minutes}d"
            },
            memory = new
            {
                workingSetMb = memMb,
                gcHeapMb
            },
            gc = new
            {
                gen0 = GC.CollectionCount(0),
                gen1 = GC.CollectionCount(1),
                gen2 = GC.CollectionCount(2)
            },
            database = new
            {
                users,
                activeUsers,
                persons,
                meetings,
                tasks,
                messages,
                conversations,
                unreadNotifications = unreadNotifs,
                activityLogs  = logs
            },
            activity = new
            {
                last24Hours = logs24h,
                last7Days   = logs7d
            },
            environment = new
            {
                dotnetVersion  = Environment.Version.ToString(),
                processorCount = Environment.ProcessorCount,
                os             = Environment.OSVersion.Platform.ToString()
            },
            recentCriticalActions = recentErrors
        });
    }
}
