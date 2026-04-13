using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using PersonTrack.API.Models;
using PersonTrack.API.Services;
using PersonTrack.Tests.Helpers;

namespace PersonTrack.Tests.Services;

public class TokenServiceTests
{
    private readonly TokenService _svc;

    public TokenServiceTests()
    {
        _svc = new TokenService(ConfigHelper.CreateJwtConfig());
    }

    [Fact]
    public void GenerateToken_ReturnsNonEmptyString()
    {
        var user = new User { Id = 1, Username = "admin", Email = "admin@test.com", Role = "Admin", IsActive = true };
        var token = _svc.GenerateToken(user);
        Assert.NotEmpty(token);
    }

    [Fact]
    public void GenerateToken_ContainsUserIdClaim()
    {
        var user = new User { Id = 42, Username = "testuser", Email = "t@test.com", Role = "User", IsActive = true };
        var token = _svc.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var sub = jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "nameid").Value;
        Assert.Equal("42", sub);
    }

    [Fact]
    public void GenerateToken_ContainsRoleClaim()
    {
        var user = new User { Id = 1, Username = "manager", Email = "m@test.com", Role = "Manager", IsActive = true };
        var token = _svc.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var role = jwt.Claims.First(c => c.Type == ClaimTypes.Role || c.Type == "role").Value;
        Assert.Equal("Manager", role);
    }

    [Fact]
    public void GenerateToken_ContainsPersonIdClaim_WhenSet()
    {
        var user = new User { Id = 3, Username = "user1", Email = "u@test.com", Role = "User", IsActive = true, PersonId = 7 };
        var token = _svc.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var personId = jwt.Claims.FirstOrDefault(c => c.Type == "PersonId")?.Value;
        Assert.Equal("7", personId);
    }

    [Fact]
    public void GenerateToken_DoesNotContainPersonIdClaim_WhenNotSet()
    {
        var user = new User { Id = 1, Username = "admin", Email = "a@test.com", Role = "Admin", IsActive = true };
        var token = _svc.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var personIdClaim = jwt.Claims.FirstOrDefault(c => c.Type == "PersonId");
        Assert.Null(personIdClaim);
    }

    [Fact]
    public void GenerateToken_IsNotExpired()
    {
        var user = new User { Id = 1, Username = "admin", Email = "a@test.com", Role = "Admin", IsActive = true };
        var token = _svc.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.True(jwt.ValidTo > DateTime.UtcNow);
    }
}
