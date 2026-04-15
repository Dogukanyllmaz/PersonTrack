using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Services;

public class ActivityLogService
{
    private readonly AppDbContext _db;

    public ActivityLogService(AppDbContext db) => _db = db;

    public async Task LogAsync(
        int userId,
        string entityType,
        int? entityId,
        string entityName,
        string action,
        string? details = null,
        string? ipAddress = null,
        string? userAgent = null)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = userId,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            Action = action,
            Details = details,
            IpAddress = ipAddress,
            UserAgent = userAgent
        });
        await _db.SaveChangesAsync();
    }
}
