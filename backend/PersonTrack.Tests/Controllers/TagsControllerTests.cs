using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class TagsControllerTests
{
    private TagsController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new TagsController(db);
    }

    [Fact]
    public async Task GetAll_ReturnsAllTags()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task Create_NewTag_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Create(new TagRequest("YeniEtiket", "#ff0000"));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Create_DuplicateTagName_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Create(new TagRequest("VIP", "#ff0000"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_NoColorProvided_UsesDefault()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Create(new TagRequest("EtiketRenksiz", null));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingTag_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentTag_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddToPerson_ValidPersonAndTag_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddToPerson(1, 1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task AddToPerson_NonExistentPerson_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddToPerson(999, 1);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddToPerson_NonExistentTag_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddToPerson(1, 999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task RemoveFromPerson_ExistingTag_AfterAdding_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        // First add the tag
        await ctrl.AddToPerson(1, 1);
        // Then remove it
        var result = await ctrl.RemoveFromPerson(1, 1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task AddToMeeting_ValidMeetingAndTag_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddToMeeting(1, 1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task RemoveFromMeeting_NonExistentRelation_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.RemoveFromMeeting(1, 999);

        Assert.IsType<NotFoundResult>(result);
    }
}
