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
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        return Ok(new AuthResponse(user.Id, user.Username, user.Email, user.Role, token, refreshToken));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == req.RefreshToken && !r.IsRevoked && r.ExpiresAt > DateTime.UtcNow);

        if (stored == null)
            return Unauthorized(new { message = "Geçersiz veya süresi dolmuş refresh token." });

        var user = stored.User!;
        if (!user.IsActive)
            return Unauthorized(new { message = "Hesap devre dışı." });

        // Rotate: revoke old, issue new
        stored.IsRevoked = true;
        var newAccessToken = _tokenService.GenerateToken(user);
        var newRefreshToken = await CreateRefreshTokenAsync(user.Id);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse(user.Id, user.Username, user.Email, user.Role, newAccessToken, newRefreshToken));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest? req)
    {
        if (req != null && !string.IsNullOrEmpty(req.RefreshToken))
        {
            var token = await _db.RefreshTokens
                .FirstOrDefaultAsync(r => r.Token == req.RefreshToken);
            if (token != null)
            {
                token.IsRevoked = true;
                await _db.SaveChangesAsync();
            }
        }
        return Ok(new { message = "Çıkış yapıldı." });
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

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user == null)
            return Ok(new { otp = (string?)null, message = "Eğer bu e-posta kayıtlıysa sıfırlama kodu oluşturulur." });

        var oldTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        foreach (var t in oldTokens) t.IsUsed = true;

        var otp = Random.Shared.Next(100000, 999999).ToString();
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            Token = Guid.NewGuid().ToString("N"),
            OtpCode = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = DateTime.UtcNow.AddHours(2)
        });
        await _db.SaveChangesAsync();

        return Ok(new { otp, message = "Sıfırlama kodunuz oluşturuldu." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        if (req.NewPassword.Length < 6)
            return BadRequest(new { message = "Şifre en az 6 karakter olmalıdır." });

        var activeTokens = await _db.PasswordResetTokens
            .Include(t => t.User)
            .Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        var match = activeTokens.FirstOrDefault(t => BCrypt.Net.BCrypt.Verify(req.OtpCode, t.OtpCode));

        if (match == null)
            return BadRequest(new { message = "Geçersiz veya süresi dolmuş sıfırlama kodu." });

        var user = match.User!;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        match.IsUsed = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz." });
    }

    private async Task<string> CreateRefreshTokenAsync(int userId)
    {
        // Clean up old tokens for this user (keep it tidy)
        var old = await _db.RefreshTokens
            .Where(r => r.UserId == userId && (r.IsRevoked || r.ExpiresAt <= DateTime.UtcNow))
            .ToListAsync();
        _db.RefreshTokens.RemoveRange(old);

        var token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        });
        await _db.SaveChangesAsync();
        return token;
    }
}
