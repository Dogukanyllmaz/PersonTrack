using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class NotificationsControllerTests
{
    private NotificationsController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new NotificationsController(db);
    }

    [Fact]
    public async Task GetMine_ReturnsUserNotifications()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.GetMine(false);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Equal(2, list.Count()); // admin has 2 notifications
    }

    [Fact]
    public async Task GetMine_UnreadOnly_ReturnsOnlyUnread()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.GetMine(true);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Single(list); // admin has 1 unread notification
    }

    [Fact]
    public async Task UnreadCount_ReturnsCorrectCount()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.UnreadCount();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task MarkRead_ExistingNotification_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.MarkRead(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task MarkRead_NotificationOfOtherUser_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1); // notification 3 belongs to user 2

        var result = await ctrl.MarkRead(3);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task MarkAllRead_MarksAllUnread()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.MarkAllRead();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Delete_ExistingNotification_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NotificationOfOtherUser_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1); // notification 3 belongs to user 2

        var result = await ctrl.Delete(3);

        Assert.IsType<NotFoundResult>(result);
    }
}
