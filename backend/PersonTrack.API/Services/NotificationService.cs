using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateAsync(int userId, string title, string message, string type = "system", string? link = null)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            Link = link
        });
        await _db.SaveChangesAsync();
    }

    public async Task CreateForAllAdminsAsync(string title, string message, string type = "system", string? link = null)
    {
        var admins = await _db.Users.Where(u => u.Role == "Admin" && u.IsActive).ToListAsync();
        foreach (var admin in admins)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = admin.Id,
                Title = title,
                Message = message,
                Type = type,
                Link = link
            });
        }
        await _db.SaveChangesAsync();
    }

    public async Task CreateForRoleAsync(string role, string title, string message, string type = "system", string? link = null)
    {
        var users = await _db.Users.Where(u => (u.Role == role || u.Role == "Admin") && u.IsActive).ToListAsync();
        foreach (var user in users)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = user.Id,
                Title = title,
                Message = message,
                Type = type,
                Link = link
            });
        }
        await _db.SaveChangesAsync();
    }
}
