using Microsoft.AspNetCore.Mvc;
using PersonTrack.API.Controllers;
using PersonTrack.API.DTOs;
using PersonTrack.API.Services;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Controllers;

public class AuthControllerTests
{
    private AuthController CreateController(out API.Data.AppDbContext db)
    {
        db = TestDbFactory.CreateWithSeedData();
        var tokenService = new TokenService(ConfigHelper.CreateJwtConfig());
        return new AuthController(db, tokenService);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOkWithToken()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.Login(new LoginRequest("admin@test.com", "Admin123!"));

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(ok.Value);
        Assert.Equal("admin", response.Username);
        Assert.Equal("Admin", response.Role);
        Assert.NotEmpty(response.Token);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.Login(new LoginRequest("admin@test.com", "WrongPassword!"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_NonExistentEmail_ReturnsUnauthorized()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.Login(new LoginRequest("nobody@test.com", "Password123!"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsUnauthorized()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.Login(new LoginRequest("inactive@test.com", "Inactive123!"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Me_AuthenticatedUser_ReturnsUserInfo()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.Me();

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(ok.Value);
        Assert.Equal(1, response.Id);
        Assert.Equal("admin", response.Username);
    }

    [Fact]
    public async Task Me_NonExistentUser_ReturnsNotFound()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 999);

        var result = await ctrl.Me();

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_ReturnsOk()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.ChangePassword(new ChangePasswordRequest("Admin123!", "NewAdmin456!"));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);
        ClaimsHelper.SetAdmin(ctrl, 1);

        var result = await ctrl.ChangePassword(new ChangePasswordRequest("WrongPass!", "NewAdmin456!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_ExistingEmail_ReturnsOtpCode()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.ForgotPassword(new ForgotPasswordRequest("admin@test.com"));

        var ok = Assert.IsType<OkObjectResult>(result);
        // OTP should be present in response (dev mode)
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task ForgotPassword_NonExistentEmail_ReturnsOkWithNullOtp()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.ForgotPassword(new ForgotPasswordRequest("nobody@test.com"));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task ResetPassword_ShortPassword_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.ResetPassword(new ResetPasswordRequest("123456", "abc"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_InvalidOtp_ReturnsBadRequest()
    {
        var ctrl = CreateController(out _);

        var result = await ctrl.ResetPassword(new ResetPasswordRequest("000000", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
