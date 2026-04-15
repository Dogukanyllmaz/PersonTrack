using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.DTOs;
using PersonTrack.API.Models;
using PersonTrack.API.Services;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly NotificationService _notif;
    private readonly ActivityLogService _audit;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUsername => User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("username") ?? "Admin";

    public AdminController(AppDbContext db, TokenService tokenService,
        NotificationService notif, ActivityLogService audit)
    {
        _db = db;
        _tokenService = tokenService;
        _notif = notif;
        _audit = audit;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .Include(u => u.Person)
            .Select(u => new
            {
                u.Id, u.Username, u.Email, u.Role, u.IsActive, u.CreatedAt,
                u.PersonId,
                PersonName = u.Person != null ? u.Person.FirstName + " " + u.Person.LastName : null
            })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Bu email zaten kullanılıyor." });

        var user = new User
        {
            Username     = req.Username,
            Email        = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = "User"
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Admin bildirimi — tüm adminler yeni kullanıcıdan haberdar olsun
        await _notif.CreateForAllAdminsAsync(
            "Yeni Kullanıcı Oluşturuldu",
            $"{CurrentUsername} tarafından '{req.Username}' ({req.Email}) hesabı oluşturuldu.",
            type: "system", link: "/admin");

        return Ok(new { user.Id, user.Username, user.Email, user.Role });
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> SetRole(int id, [FromBody] string role)
    {
        if (role is not ("Admin" or "Manager" or "User"))
            return BadRequest(new { message = "Geçersiz rol. 'Admin', 'Manager' veya 'User' olmalı." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var oldRole = user.Role;
        user.Role   = role;
        await _db.SaveChangesAsync();

        // Kritik: rol değişikliği → tüm adminlere bildir
        await _notif.CreateForAllAdminsAsync(
            "Kullanıcı Rolü Değiştirildi",
            $"{CurrentUsername} → '{user.Username}' kullanıcısının rolü {oldRole} → {role} olarak değiştirildi.",
            type: "system", link: "/admin");

        await _audit.LogAsync(CurrentUserId, "User", user.Id, user.Username, "SetUserRole",
            $"Rol: {oldRole} → {role}",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            HttpContext.Request.Headers.UserAgent.ToString().Take(300).ToString());

        return Ok(new { user.Id, user.Role });
    }

    [HttpPut("users/{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        if (id == CurrentUserId)
            return BadRequest(new { message = "Kendi hesabınızı devre dışı bırakamazsınız." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();

        var stateLabel = user.IsActive ? "aktifleştirildi" : "devre dışı bırakıldı";
        await _notif.CreateForAllAdminsAsync(
            $"Kullanıcı {stateLabel.ToUpper()}",
            $"{CurrentUsername} → '{user.Username}' hesabı {stateLabel}.",
            type: "system", link: "/admin");

        return Ok(new { user.Id, user.IsActive });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (id == CurrentUserId)
            return BadRequest(new { message = "Kendi hesabınızı silemezsiniz." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var deletedName  = user.Username;
        var deletedEmail = user.Email;

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        // En kritik işlem: kullanıcı silme
        await _notif.CreateForAllAdminsAsync(
            "Kullanıcı Silindi",
            $"{CurrentUsername} → '{deletedName}' ({deletedEmail}) hesabı kalıcı olarak silindi.",
            type: "system", link: "/admin");

        await _audit.LogAsync(CurrentUserId, "User", id, deletedName, "Delete",
            $"Silinen: {deletedEmail}",
            HttpContext.Connection.RemoteIpAddress?.ToString());

        return NoContent();
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] string newPassword)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.SaveChangesAsync();

        await _notif.CreateForAllAdminsAsync(
            "Şifre Sıfırlandı",
            $"{CurrentUsername} → '{user.Username}' kullanıcısının şifresi admin tarafından sıfırlandı.",
            type: "system", link: "/admin");

        return Ok(new { message = "Şifre sıfırlandı." });
    }

    // ── Person-User Linking ────────────────────────────────────────────────

    [HttpPost("persons/{personId}/create-account")]
    public async Task<IActionResult> CreateAccountForPerson(int personId, [FromBody] RegisterRequest req)
    {
        var person = await _db.Persons.FindAsync(personId);
        if (person == null) return NotFound(new { message = "Kişi bulunamadı." });

        if (await _db.Users.AnyAsync(u => u.PersonId == personId))
            return BadRequest(new { message = "Bu kişiye zaten bir hesap bağlı." });

        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Bu email zaten kullanılıyor." });

        var user = new User
        {
            Username     = req.Username,
            Email        = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = "User",
            PersonId     = personId
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.Username, user.Email, user.Role, user.PersonId });
    }

    [HttpPut("users/{userId}/link-person/{personId}")]
    public async Task<IActionResult> LinkPersonToUser(int userId, int personId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (!await _db.Persons.AnyAsync(p => p.Id == personId))
            return NotFound(new { message = "Kişi bulunamadı." });

        if (await _db.Users.AnyAsync(u => u.PersonId == personId && u.Id != userId))
            return BadRequest(new { message = "Bu kişiye zaten başka bir hesap bağlı." });

        user.PersonId = personId;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.PersonId });
    }

    [HttpPut("users/{userId}/unlink-person")]
    public async Task<IActionResult> UnlinkPerson(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        user.PersonId = null;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.PersonId });
    }

    [HttpGet("persons/{personId}/account")]
    public async Task<IActionResult> GetPersonAccount(int personId)
    {
        var user = await _db.Users
            .Where(u => u.PersonId == personId)
            .Select(u => new { u.Id, u.Username, u.Email, u.Role, u.IsActive, u.CreatedAt, u.PersonId })
            .FirstOrDefaultAsync();

        if (user == null) return NotFound(new { message = "Bu kişiye bağlı hesap yok." });
        return Ok(user);
    }

    // ── Password Reset Tokens ──────────────────────────────────────────────

    [HttpGet("reset-tokens")]
    public async Task<IActionResult> GetResetTokens()
    {
        var tokens = await _db.PasswordResetTokens
            .Include(t => t.User)
            .Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.UserId,
                UserEmail = t.User != null ? t.User.Email    : "",
                UserName  = t.User != null ? t.User.Username : "",
                t.CreatedAt, t.ExpiresAt
            })
            .ToListAsync();
        return Ok(tokens);
    }

    [HttpPost("users/{userId}/generate-otp")]
    public async Task<IActionResult> GenerateOtp(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var old = await _db.PasswordResetTokens
            .Where(t => t.UserId == userId && !t.IsUsed)
            .ToListAsync();
        foreach (var t in old) t.IsUsed = true;

        var otp = Random.Shared.Next(100000, 999999).ToString();
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId    = userId,
            Token     = Guid.NewGuid().ToString("N"),
            OtpCode   = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        });
        await _db.SaveChangesAsync();
        return Ok(new { otp, expiresIn = "24 saat", userEmail = user.Email });
    }
}
