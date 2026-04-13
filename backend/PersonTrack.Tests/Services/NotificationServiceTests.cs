using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Models;
using PersonTrack.API.Services;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Services;

public class NotificationServiceTests
{
    [Fact]
    public async Task CreateAsync_CreatesNotificationForUser()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new NotificationService(db);

        await svc.CreateAsync(1, "Test Başlık", "Test mesaj", "system", "/dashboard");

        var notif = await db.Notifications
            .Where(n => n.UserId == 1 && n.Title == "Test Başlık")
            .FirstOrDefaultAsync();

        Assert.NotNull(notif);
        Assert.Equal("Test mesaj", notif.Message);
        Assert.Equal("system", notif.Type);
        Assert.Equal("/dashboard", notif.Link);
        Assert.False(notif.IsRead);
    }

    [Fact]
    public async Task CreateAsync_DefaultType_IsSystem()
    {
        var db = TestDbFactory.Create();
        db.Users.Add(new User { Id = 1, Username = "u", Email = "u@t.com", PasswordHash = "h", Role = "Admin", IsActive = true });
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        await svc.CreateAsync(1, "T", "M");

        var notif = await db.Notifications.FirstAsync(n => n.UserId == 1);
        Assert.Equal("system", notif.Type);
        Assert.Null(notif.Link);
    }

    [Fact]
    public async Task CreateForAllAdminsAsync_CreatesNotificationForEachAdmin()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new NotificationService(db);
        var beforeCount = await db.Notifications.CountAsync(n => n.UserId == 1);

        await svc.CreateForAllAdminsAsync("Admin Bildirimi", "Tüm adminler için", "system");

        var afterCount = await db.Notifications.CountAsync(n => n.UserId == 1);
        Assert.Equal(beforeCount + 1, afterCount);

        // Manager should NOT receive this notification
        var managerNotif = await db.Notifications
            .Where(n => n.UserId == 2 && n.Title == "Admin Bildirimi")
            .FirstOrDefaultAsync();
        Assert.Null(managerNotif);
    }

    [Fact]
    public async Task CreateForAllAdminsAsync_SkipsInactiveUsers()
    {
        var db = TestDbFactory.Create();
        db.Users.Add(new User { Id = 1, Username = "admin", Email = "a@t.com", PasswordHash = "h", Role = "Admin", IsActive = false });
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        await svc.CreateForAllAdminsAsync("T", "M");

        var count = await db.Notifications.CountAsync();
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task CreateForRoleAsync_CreatesNotificationForRoleAndAdmins()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new NotificationService(db);

        await svc.CreateForRoleAsync("Manager", "Yeni Manager Bildirimi", "Yetkililer için", "task_overdue");

        // Admin (userId=1) should receive
        var adminNotif = await db.Notifications
            .Where(n => n.UserId == 1 && n.Title == "Yeni Manager Bildirimi")
            .FirstOrDefaultAsync();
        Assert.NotNull(adminNotif);

        // Manager (userId=2) should receive
        var managerNotif = await db.Notifications
            .Where(n => n.UserId == 2 && n.Title == "Yeni Manager Bildirimi")
            .FirstOrDefaultAsync();
        Assert.NotNull(managerNotif);
        Assert.Equal("task_overdue", managerNotif.Type);
    }

    [Fact]
    public async Task CreateForRoleAsync_DoesNotNotifyRegularUser()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new NotificationService(db);

        await svc.CreateForRoleAsync("Manager", "Manager Exclusive Notice", "Sadece manager");

        var userNotif = await db.Notifications
            .Where(n => n.UserId == 3 && n.Title == "Manager Exclusive Notice")
            .FirstOrDefaultAsync();
        Assert.Null(userNotif);
    }
}
