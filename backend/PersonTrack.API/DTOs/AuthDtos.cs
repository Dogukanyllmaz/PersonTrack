namespace PersonTrack.API.DTOs;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string Username, string Email, string Password);

public record AuthResponse(int Id, string Username, string Email, string Role, string Token, string? RefreshToken = null);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string OtpCode, string NewPassword);

public record RefreshRequest(string RefreshToken);
