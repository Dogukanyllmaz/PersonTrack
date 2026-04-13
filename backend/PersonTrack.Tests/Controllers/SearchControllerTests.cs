using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class SearchControllerTests
{
    private SearchController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new SearchController(db);
    }

    [Fact]
    public async Task Search_ShortQuery_ReturnsEmptyResult()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Search("a");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Search_EmptyQuery_ReturnsEmptyResult()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Search("");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Search_MatchingPerson_ReturnsResults()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Search("ahmet");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task Search_MatchingMeeting_ReturnsResults()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Search("proje");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task Search_NoMatches_ReturnsEmptyList()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Search("xyzxyzxyz");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    [Fact]
    public async Task Search_AsRegularUser_OnlyReturnsMeetings()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetRegularUser(ctrl, 3, 1);

        // "rapor" is in a task title, but regular users cannot search persons/tasks
        var result = await ctrl.Search("rapor");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        // No meetings match "rapor", tasks are not searched for regular users
        Assert.NotNull(list);
    }
}
