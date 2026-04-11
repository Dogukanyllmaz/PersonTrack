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
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext db, TokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Geçersiz email veya şifre." });

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponse(user.Id, user.Username, user.Email, user.Role, token));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(new AuthResponse(user.Id, user.Username, user.Email, user.Role, ""));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre yanlış." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Şifre güncellendi." });
    }

    /// <summary>
    /// Şifremi unuttum: Email gönder, 6 haneli OTP kodu üretilir.
    /// Sistemde mail sunucusu varsa email gönderilir; yoksa admin panelden kodu görebilir.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user == null)
            return Ok(new { otp = (string?)null, message = "Eğer bu e-posta kayıtlıysa sıfırlama kodu oluşturulur." });

        // Mevcut kullanılmamış token'ları geçersiz kıl
        var oldTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        foreach (var t in oldTokens) t.IsUsed = true;

        // 6 haneli OTP üret
        var otp = Random.Shared.Next(100000, 999999).ToString();
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            Token = Guid.NewGuid().ToString("N"),
            OtpCode = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = DateTime.UtcNow.AddHours(2)
        });
        await _db.SaveChangesAsync();

        // SMTP olmadığından OTP doğrudan döndürülüyor
        // Gerçek e-posta altyapısı kurulduğunda bu kaldırılıp mail gönderilmeli
        return Ok(new { otp, message = "Sıfırlama kodunuz oluşturuldu." });
    }

    /// <summary>
    /// OTP kodu + yeni şifre ile şifre sıfırlama.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        if (req.NewPassword.Length < 6)
            return BadRequest(new { message = "Şifre en az 6 karakter olmalıdır." });

        // Geçerli token'ları al (son 2 saat içinde oluşturulmuş, kullanılmamış)
        var activeTokens = await _db.PasswordResetTokens
            .Include(t => t.User)
            .Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        // OTP kodu eşleşen token'ı bul
        var match = activeTokens.FirstOrDefault(t => BCrypt.Net.BCrypt.Verify(req.OtpCode, t.OtpCode));

        if (match == null)
            return BadRequest(new { message = "Geçersiz veya süresi dolmuş sıfırlama kodu." });

        var user = match.User!;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        match.IsUsed = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz." });
    }
}
