using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class ExportControllerTests
{
    private ExportController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new ExportController(db);
    }

    [Fact]
    public async Task ExportPersons_ReturnsExcelFile()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.ExportPersons();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.ContentType);
        Assert.NotEmpty(file.FileContents);
    }

    [Fact]
    public async Task ExportTasks_ReturnsExcelFile()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.ExportTasks();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.ContentType);
        Assert.NotEmpty(file.FileContents);
    }

    [Fact]
    public async Task ExportMeetings_ReturnsExcelFile()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.ExportMeetings();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.ContentType);
        Assert.NotEmpty(file.FileContents);
    }

    [Fact]
    public async Task ExportPersons_EmptyDatabase_ReturnsValidFile()
    {
        var db = TestDbFactory.Create();
        var ctrl = new ExportController(db);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.ExportPersons();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.NotEmpty(file.FileContents);
    }
}
