using System.ComponentModel.DataAnnotations;

namespace PersonTrack.API.DTOs;

public record LoginRequest(
    [Required(ErrorMessage = "Email adresi zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz.")]
    string Email,

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
    string Password
);

public record RegisterRequest(
    [Required(ErrorMessage = "Kullanıcı adı zorunludur.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Kullanıcı adı 3-50 karakter arasında olmalıdır.")]
    string Username,

    [Required(ErrorMessage = "Email adresi zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz.")]
    string Email,

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
    string Password
);

public record AuthResponse(int Id, string Username, string Email, string Role, string Token, string? RefreshToken = null);

public record ChangePasswordRequest(
    [Required(ErrorMessage = "Mevcut şifre zorunludur.")]
    string CurrentPassword,

    [Required(ErrorMessage = "Yeni şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Yeni şifre en az 6 karakter olmalıdır.")]
    string NewPassword
);

public record ForgotPasswordRequest(
    [Required(ErrorMessage = "Email adresi zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz.")]
    string Email
);

public record ResetPasswordRequest(
    [Required(ErrorMessage = "OTP kodu zorunludur.")]
    string OtpCode,

    [Required(ErrorMessage = "Yeni şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Yeni şifre en az 6 karakter olmalıdır.")]
    string NewPassword
);

public record RefreshRequest(string RefreshToken);

public record UpdateProfileRequest(
    [Required(ErrorMessage = "Kullanıcı adı zorunludur.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Kullanıcı adı 3-50 karakter arasında olmalıdır.")]
    string Username
);
