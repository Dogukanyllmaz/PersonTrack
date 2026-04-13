using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Services;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Services;

public class ActivityLogServiceTests
{
    [Fact]
    public async Task LogAsync_CreatesActivityLog()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new ActivityLogService(db);

        await svc.LogAsync(1, "Person", 2, "Ayşe Kaya", "Update", "Email güncellendi");

        var log = await db.ActivityLogs
            .FirstOrDefaultAsync(a => a.EntityName == "Ayşe Kaya" && a.Action == "Update");

        Assert.NotNull(log);
        Assert.Equal(1, log.UserId);
        Assert.Equal("Person", log.EntityType);
        Assert.Equal(2, log.EntityId);
        Assert.Equal("Email güncellendi", log.Details);
    }

    [Fact]
    public async Task LogAsync_WithNullDetails_SavesNullDetails()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new ActivityLogService(db);

        await svc.LogAsync(1, "Meeting", 1, "Proje Toplantısı", "Create");

        var log = await db.ActivityLogs
            .FirstOrDefaultAsync(a => a.EntityName == "Proje Toplantısı");

        Assert.NotNull(log);
        Assert.Null(log.Details);
    }

    [Fact]
    public async Task LogAsync_WithNullEntityId_SavesNull()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new ActivityLogService(db);

        await svc.LogAsync(1, "System", null, "Sistem", "Login");

        var log = await db.ActivityLogs
            .FirstOrDefaultAsync(a => a.EntityType == "System" && a.Action == "Login");

        Assert.NotNull(log);
        Assert.Null(log.EntityId);
    }

    [Fact]
    public async Task LogAsync_CreatesMultipleLogs()
    {
        var db = TestDbFactory.CreateWithSeedData();
        var svc = new ActivityLogService(db);
        var before = await db.ActivityLogs.CountAsync();

        await svc.LogAsync(1, "Person", 1, "Ahmet Yılmaz", "Update");
        await svc.LogAsync(2, "Task", 1, "Rapor Hazırla", "Complete");

        var after = await db.ActivityLogs.CountAsync();
        Assert.Equal(before + 2, after);
    }
}
