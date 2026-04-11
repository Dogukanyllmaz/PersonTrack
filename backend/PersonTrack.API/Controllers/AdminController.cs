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

    public AdminController(AppDbContext db, TokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
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
            Username = req.Username,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "User"
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.Username, user.Email, user.Role });
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> SetRole(int id, [FromBody] string role)
    {
        if (role != "Admin" && role != "Manager" && role != "User")
            return BadRequest(new { message = "Geçersiz rol. 'Admin', 'Manager' veya 'User' olmalı." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = role;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.Role });
    }

    [HttpPut("users/{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentUserId)
            return BadRequest(new { message = "Kendi hesabınızı devre dışı bırakamazsınız." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.IsActive });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentUserId)
            return BadRequest(new { message = "Kendi hesabınızı silemezsiniz." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] string newPassword)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Şifre sıfırlandı." });
    }

    // ── Person-User Linking ────────────────────────────────────────────

    /// <summary>
    /// Bir kişi kartı için yeni kullanıcı hesabı oluşturur ve o kişiyle ilişkilendirir.
    /// </summary>
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
            Username = req.Username,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "User",
            PersonId = personId
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.Username, user.Email, user.Role, user.PersonId });
    }

    /// <summary>
    /// Mevcut bir kullanıcı hesabını bir kişiyle ilişkilendirir.
    /// </summary>
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

    /// <summary>
    /// Kullanıcı-kişi ilişkisini kaldırır.
    /// </summary>
    [HttpPut("users/{userId}/unlink-person")]
    public async Task<IActionResult> UnlinkPerson(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        user.PersonId = null;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.PersonId });
    }

    /// <summary>
    /// Belirli bir kişiye bağlı kullanıcı hesabını döndürür.
    /// </summary>
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

    // ── Password Reset Tokens (admin görünümü) ─────────────────────────

    /// <summary>
    /// Bekleyen şifre sıfırlama isteklerini listeler.
    /// </summary>
    [HttpGet("reset-tokens")]
    public async Task<IActionResult> GetResetTokens()
    {
        var tokens = await _db.PasswordResetTokens
            .Include(t => t.User)
            .Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                UserEmail = t.User != null ? t.User.Email : "",
                UserName = t.User != null ? t.User.Username : "",
                t.CreatedAt,
                t.ExpiresAt
            })
            .ToListAsync();
        return Ok(tokens);
    }

    /// <summary>
    /// Admin, bir kullanıcı için tek kullanımlık OTP kodu üretir (şifre sıfırlama).
    /// </summary>
    [HttpPost("users/{userId}/generate-otp")]
    public async Task<IActionResult> GenerateOtp(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // Eskilerini geçersiz kıl
        var old = await _db.PasswordResetTokens
            .Where(t => t.UserId == userId && !t.IsUsed)
            .ToListAsync();
        foreach (var t in old) t.IsUsed = true;

        var otp = Random.Shared.Next(100000, 999999).ToString();
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = userId,
            Token = Guid.NewGuid().ToString("N"),
            OtpCode = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        });
        await _db.SaveChangesAsync();

        // OTP'yi açık metin olarak döndür — admin kullanıcıya iletecek
        return Ok(new { otp, expiresIn = "24 saat", userEmail = user.Email });
    }
}
