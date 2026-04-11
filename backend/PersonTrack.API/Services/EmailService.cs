using System.Net;
using System.Net.Mail;

namespace PersonTrack.API.Services;

public class EmailSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = "PersonTrack";
}

public class EmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _settings = config.GetSection("EmailSettings").Get<EmailSettings>() ?? new EmailSettings();
        _logger = logger;
    }

    public async Task SendBirthdayEmailAsync(string toEmail, string toName, int age)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("Doğum günü maili atlandı (email yok): {Name}", toName);
            return;
        }

        var subject = $"🎂 İyi Ki Doğdun, {toName}!";
        var body = BuildBirthdayHtml(toName, age);
        await SendAsync(toEmail, toName, subject, body);
    }

    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(_settings.Username) || string.IsNullOrWhiteSpace(_settings.Password))
        {
            _logger.LogWarning("E-posta ayarları yapılandırılmamış, mail gönderilmedi.");
            return;
        }

        try
        {
            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(_settings.Username, _settings.Password),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 15000
            };

            using var msg = new MailMessage
            {
                From = new MailAddress(_settings.Username, _settings.DisplayName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            msg.To.Add(new MailAddress(toEmail, toName));

            await client.SendMailAsync(msg);
            _logger.LogInformation("Mail gönderildi: {To} — {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mail gönderimi başarısız: {To}", toEmail);
        }
    }

    private static string BuildBirthdayHtml(string name, int age)
    {
        return @"<!DOCTYPE html>
<html lang=""tr"">
<head>
  <meta charset=""utf-8""/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6f9; margin:0; padding:0; }
    .wrapper { max-width:560px; margin:40px auto; background:#fff; border-radius:16px;
               box-shadow:0 2px 16px rgba(0,0,0,0.09); overflow:hidden; }
    .header { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
              padding:40px 32px; text-align:center; color:#fff; }
    .header h1 { margin:0; font-size:32px; letter-spacing:1px; }
    .header p  { margin:8px 0 0; font-size:16px; opacity:0.9; }
    .body   { padding:32px; text-align:center; color:#374151; }
    .cake   { font-size:72px; margin:0 0 16px; }
    .age    { display:inline-block; background:#f3f0ff; color:#7c3aed;
              font-size:22px; font-weight:700; padding:10px 28px;
              border-radius:100px; margin:12px 0 24px; }
    .msg    { font-size:16px; line-height:1.7; color:#4b5563; }
    .footer { background:#f9fafb; padding:20px 32px; text-align:center;
              font-size:12px; color:#9ca3af; border-top:1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class=""wrapper"">
    <div class=""header"">
      <h1>🎉 Doğum Günün Kutlu Olsun!</h1>
      <p>PersonTrack sisteminden özel bir mesaj</p>
    </div>
    <div class=""body"">
      <div class=""cake"">🎂</div>
      <h2 style=""margin:0 0 8px;font-size:24px;color:#1f2937"">Sevgili " + name + @",</h2>
      <div class=""age"">" + age + @" Yaş 🥳</div>
      <p class=""msg"">
        Bu özel günde seni en içten dileklerimizle kutluyoruz.<br/>
        Sağlık, mutluluk ve başarı dolu nice yıllar diliyoruz!
      </p>
    </div>
    <div class=""footer"">
      Bu e-posta PersonTrack sistemi tarafından otomatik olarak gönderilmiştir.
    </div>
  </div>
</body>
</html>";
    }
}
