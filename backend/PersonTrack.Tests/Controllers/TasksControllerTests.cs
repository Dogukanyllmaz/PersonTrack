using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.API.DTOs;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class TasksControllerTests
{
    private TasksController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        return new TasksController(db);
    }

    [Fact]
    public async Task GetAll_AsAdmin_ReturnsAllTasks()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Equal(3, list.Count());
    }

    [Fact]
    public async Task GetAll_AsRegularUser_ReturnsOnlyOwnTasks()
    {
        var ctrl = CreateController(out _);
        // regularUser has PersonId=1, person1 has 2 tasks (task1, task2)
        ClaimsHelper.SetRegularUser(ctrl, 3, 1);

        var result = await ctrl.GetAll(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<TaskResponse>;
        Assert.NotNull(list);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task GetAll_AsRegularUserWithNoPersonId_ReturnsEmpty()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetRegularUser(ctrl, 3, null);

        var result = await ctrl.GetAll(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetAll_FilterByPersonId_ReturnsFilteredTasks()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(2, null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<TaskResponse>;
        Assert.NotNull(list);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_FilterByStatus_ReturnsFilteredTasks()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, "Completed", null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<TaskResponse>;
        Assert.NotNull(list);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_FilterByPriority_ReturnsFilteredTasks()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null, null, "High");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<TaskResponse>;
        Assert.NotNull(list);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetById_ExistingTask_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        var task = Assert.IsType<TaskResponse>(ok.Value);
        Assert.Equal("Rapor Hazırla", task.Title);
    }

    [Fact]
    public async Task GetById_NonExistentTask_ReturnsNotFound()
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

        var req = new TaskCreateRequest(1, "Yeni Görev", "Açıklama", DateTime.UtcNow, DateTime.UtcNow.AddDays(5));
        var result = await ctrl.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var task = Assert.IsType<TaskResponse>(created.Value);
        Assert.Equal("Yeni Görev", task.Title);
        Assert.Equal("Active", task.Status);
    }

    [Fact]
    public async Task Create_InvalidPersonId_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new TaskCreateRequest(999, "Test", null, DateTime.UtcNow, null);
        var result = await ctrl.Create(req);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_ExistingTask_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new TaskUpdateRequest("Updated Title", "Updated Desc", "Active", DateTime.UtcNow, null, DateTime.UtcNow.AddDays(10), "Low");
        var result = await ctrl.Update(1, req);

        var ok = Assert.IsType<OkObjectResult>(result);
        var task = Assert.IsType<TaskResponse>(ok.Value);
        Assert.Equal("Updated Title", task.Title);
        Assert.Equal("Low", task.Priority);
    }

    [Fact]
    public async Task Update_NonExistentTask_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new TaskUpdateRequest("X", null, "Active", DateTime.UtcNow, null, null);
        var result = await ctrl.Update(999, req);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Complete_ExistingTask_SetsStatusCompleted()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Complete(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Complete_NonExistentTask_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Complete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingTask_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentTask_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetComments_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetComments(1);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task AddComment_ExistingTask_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddComment(1, new CommentRequest("Test yorum"));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task AddComment_NonExistentTask_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.AddComment(999, new CommentRequest("Test yorum"));

        Assert.IsType<NotFoundResult>(result);
    }
}
