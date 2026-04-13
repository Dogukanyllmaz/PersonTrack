using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PersonTrack.API.Controllers;
using PersonTrack.API.DTOs;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class PersonsControllerTests
{
    private PersonsController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
        return new PersonsController(db, env.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsAllPersons()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll(null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<object>;
        Assert.NotNull(list);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task GetAll_WithSearch_FiltersResults()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetAll("ahmet");

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = ok.Value as IEnumerable<PersonResponse>;
        Assert.NotNull(list);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetById_ExistingPerson_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        var person = Assert.IsType<PersonResponse>(ok.Value);
        Assert.Equal("Ahmet", person.FirstName);
        Assert.Equal("Yılmaz", person.LastName);
    }

    [Fact]
    public async Task GetById_NonExistentPerson_ReturnsNotFound()
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

        var req = new PersonCreateRequest("Yeni", "Kişi", "yeni@test.com", null, null, null, null, null, null, null);
        var result = await ctrl.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var person = Assert.IsType<PersonResponse>(created.Value);
        Assert.Equal("Yeni", person.FirstName);
    }

    [Fact]
    public async Task Create_WithExistingEmail_WhenPasswordProvided_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        // admin@test.com is already in the DB as a user
        var req = new PersonCreateRequest("Test", "Person", "admin@test.com", null, null, null, null, null, "password123", null);
        var result = await ctrl.Create(req);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_ExistingPerson_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new PersonUpdateRequest("Ahmet", "Yılmaz Updated", "updated@test.com", null, null, null, "Manager", "New Corp", null);
        var result = await ctrl.Update(1, req);

        var ok = Assert.IsType<OkObjectResult>(result);
        var person = Assert.IsType<PersonResponse>(ok.Value);
        Assert.Equal("Yılmaz Updated", person.LastName);
    }

    [Fact]
    public async Task Update_NonExistentPerson_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new PersonUpdateRequest("X", "Y", null, null, null, null, null, null, null);
        var result = await ctrl.Update(999, req);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingPerson_ReturnsNoContent()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(2);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentPerson_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddRelationship_BothPersonsExist_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new AddRelationshipRequest(2, "Colleague", null);
        var result = await ctrl.AddRelationship(1, req);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task AddRelationship_RelatedPersonNotFound_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var req = new AddRelationshipRequest(999, "Colleague", null);
        var result = await ctrl.AddRelationship(1, req);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetUpcomingBirthdays_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl);

        var result = await ctrl.GetUpcomingBirthdays(30);

        Assert.IsType<OkObjectResult>(result);
    }
}
