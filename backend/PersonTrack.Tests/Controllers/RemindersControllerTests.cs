using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class RemindersControllerTests
{
    private RemindersController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new RemindersController(db);
    }

    [Fact]
    public async Task GetMine_ReturnsUserReminders()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.GetMine();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Single(list); // admin has 1 reminder in seed data
    }

    [Fact]
    public async Task GetMine_OtherUser_ReturnsEmpty()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetManager(ctrl, 2); // manager has no reminders

        var result = await ctrl.GetMine();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    [Fact]
    public async Task Create_ValidReminder_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var req = new ReminderRequest("Yeni Hatırlatma", "Notlar", DateTime.UtcNow.AddDays(5), false, null, null, null);
        var result = await ctrl.Create(req);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Create_RecurringReminder_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var req = new ReminderRequest("Haftalık", null, DateTime.UtcNow.AddDays(1), true, 7, null, null);
        var result = await ctrl.Create(req);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Create_WithPersonLink_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var req = new ReminderRequest("Kişi Hatırlatma", null, DateTime.UtcNow.AddDays(3), false, null, 1, null);
        var result = await ctrl.Create(req);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Complete_ExistingReminder_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.Complete(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Complete_OtherUsersReminder_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetManager(ctrl, 2); // reminder 1 belongs to admin (userId=1)

        var result = await ctrl.Complete(1);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingReminder_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_OtherUsersReminder_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetManager(ctrl, 2); // reminder 1 belongs to admin

        var result = await ctrl.Delete(1);

        Assert.IsType<NotFoundResult>(result);
    }
}
