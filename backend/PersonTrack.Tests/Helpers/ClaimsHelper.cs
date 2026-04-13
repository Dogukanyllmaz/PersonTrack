using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PersonTrack.Tests.Helpers;

public static class ClaimsHelper
{
    public static ClaimsPrincipal CreatePrincipal(int userId, string role, int? personId = null)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, $"testuser_{userId}"),
            new Claim(ClaimTypes.Role, role),
        };

        if (personId.HasValue)
            claims.Add(new Claim("PersonId", personId.Value.ToString()));

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    public static void SetUser(ControllerBase controller, int userId, string role, int? personId = null)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal(userId, role, personId)
            }
        };
    }

    public static void SetAdmin(ControllerBase controller, int userId = 1) =>
        SetUser(controller, userId, "Admin");

    public static void SetManager(ControllerBase controller, int userId = 2) =>
        SetUser(controller, userId, "Manager");

    public static void SetRegularUser(ControllerBase controller, int userId = 3, int? personId = 1) =>
        SetUser(controller, userId, "User", personId);
}
