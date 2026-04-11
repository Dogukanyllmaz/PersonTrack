namespace PersonTrack.API.Models;

public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string Token { get; set; } = string.Empty; // Guid-based, 6-char OTP shown to user
    public string OtpCode { get; set; } = string.Empty; // 6-digit code for user input
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
}
