using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PersonTrack.API.Controllers;
using PersonTrack.API.DTOs;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class MeetingsControllerTests
{
    private MeetingsController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
        return new MeetingsController(db, env.Object);
    }

    [Fact]
    public async Task GetAll_AsAdmin_ReturnsAllMeetings()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<MeetingResponse>;
        Assert.NotNull(list);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task GetAll_FilterByStatus_ReturnsFilteredMeetings()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll("Completed");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<MeetingResponse>;
        Assert.NotNull(list);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_AsRegularUser_ReturnsAccessibleMeetings()
    {
        var ctrl = CreateController(out _);
        // personId=1 is a participant in meeting1
        ClaimsHelper.SetRegularUser(ctrl, 3, 1);

        var result = await ctrl.GetAll(null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<MeetingResponse>;
        Assert.NotNull(list);
        Assert.Single(list); // only meeting1 where person1 is participant
    }

    [Fact]
    public async Task GetById_ExistingMeeting_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        var meeting = Assert.IsType<MeetingResponse>(ok.Value);
        Assert.Equal("Proje Değerlendirme", meeting.Title);
    }

    [Fact]
    public async Task GetById_NonExistentMeeting_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetById(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreated()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new MeetingCreateRequest("Yeni Toplantı", "İçerik", DateTime.UtcNow.AddDays(2), new List<int> { 1 });
        var result = await ctrl.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var meeting = Assert.IsType<MeetingResponse>(created.Value);
        Assert.Equal("Yeni Toplantı", meeting.Title);
        Assert.Equal("Planned", meeting.Status);
    }

    [Fact]
    public async Task Update_ExistingMeeting_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new MeetingUpdateRequest("Güncellenmiş Toplantı", "Yeni içerik", DateTime.UtcNow.AddDays(3), new List<int> { 1, 2 });
        var result = await ctrl.Update(1, req);

        var ok = Assert.IsType<OkObjectResult>(result);
        var meeting = Assert.IsType<MeetingResponse>(ok.Value);
        Assert.Equal("Güncellenmiş Toplantı", meeting.Title);
    }

    [Fact]
    public async Task Update_NonExistentMeeting_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new MeetingUpdateRequest("X", null, DateTime.UtcNow, new List<int>());
        var result = await ctrl.Update(999, req);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Complete_ExistingMeeting_SetsStatusCompleted()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Complete(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Complete_NonExistentMeeting_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Complete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingMeeting_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentMeeting_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddNote_ExistingMeeting_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new MeetingNoteCreateRequest(null, "Test notu", null, 0);
        var result = await ctrl.AddNote(1, req);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task AddNote_NonExistentMeeting_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new MeetingNoteCreateRequest(null, "Test notu", null, 0);
        var result = await ctrl.AddNote(999, req);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddLink_SelfLink_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new AddMeetingLinkRequest(1, "follow-up");
        var result = await ctrl.AddLink(1, req);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddLink_ValidMeetings_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new AddMeetingLinkRequest(2, "follow-up");
        var result = await ctrl.AddLink(1, req);

        Assert.IsType<OkObjectResult>(result);
    }
}
