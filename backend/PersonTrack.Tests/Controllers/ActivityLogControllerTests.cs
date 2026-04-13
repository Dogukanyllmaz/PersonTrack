using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class ActivityLogControllerTests
{
    private ActivityLogController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new ActivityLogController(db);
    }

    private static JsonElement ToJson(object? value)
    {
        var json = JsonSerializer.Serialize(value);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    [Fact]
    public async Task GetAll_ReturnsLogsWithPagination()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, null, 1, 50);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetAll_FilterByEntityType_ReturnsFilteredLogs()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll("Person", null, 1, 50);

        var ok = Assert.IsType<OkObjectResult>(result);
        var elem = ToJson(ok.Value);
        Assert.Equal(1, elem.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task GetAll_FilterByNonExistentType_ReturnsEmpty()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll("NonExistent", null, 1, 50);

        var ok = Assert.IsType<OkObjectResult>(result);
        var elem = ToJson(ok.Value);
        Assert.Equal(0, elem.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task GetAll_FilterByUserId_ReturnsFilteredLogs()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, 1, 1, 50);

        var ok = Assert.IsType<OkObjectResult>(result);
        var elem = ToJson(ok.Value);
        Assert.Equal(1, elem.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task GetAll_Page2_ReturnsCorrectPage()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, null, 2, 50);

        var ok = Assert.IsType<OkObjectResult>(result);
        var elem = ToJson(ok.Value);
        Assert.Equal(2, elem.GetProperty("page").GetInt32());
    }
}
