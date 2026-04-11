using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Services;

public class BirthdayWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BirthdayWorker> _logger;

    public BirthdayWorker(IServiceScopeFactory scopeFactory, ILogger<BirthdayWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BirthdayWorker başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Sonraki 08:00'e kadar bekle (Türkiye: UTC+3, worker UTC ile çalışır → 05:00 UTC)
            var now = DateTime.UtcNow;
            var nextRun = DateTime.UtcNow.Date.AddHours(5); // 05:00 UTC = 08:00 TR
            if (now >= nextRun) nextRun = nextRun.AddDays(1);

            var delay = nextRun - now;
            _logger.LogInformation("Sonraki doğum günü kontrolü: {NextRun} UTC ({Delay:hh\\:mm} sonra)",
                nextRun, delay);

            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            await CheckAndSendBirthdaysAsync(stoppingToken);
        }
    }

    private async Task CheckAndSendBirthdaysAsync(CancellationToken ct)
    {
        _logger.LogInformation("Doğum günü kontrolü başlıyor...");
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        var today = DateTime.Today;
        var currentYear = today.Year;

        // Bugün doğum günü olan kişiler
        var persons = await db.Persons
            .Where(p => p.BirthDate.HasValue
                && p.BirthDate.Value.Month == today.Month
                && p.BirthDate.Value.Day == today.Day
                && !string.IsNullOrEmpty(p.Email))
            .ToListAsync(ct);

        _logger.LogInformation("{Count} kişinin bugün doğum günü.", persons.Count);

        foreach (var person in persons)
        {
            // Bu yıl zaten gönderildi mi?
            var alreadySent = await db.BirthdayLogs
                .AnyAsync(b => b.PersonId == person.Id && b.Year == currentYear, ct);

            if (alreadySent)
            {
                _logger.LogInformation("Zaten gönderildi: {Name} ({Year})",
                    $"{person.FirstName} {person.LastName}", currentYear);
                continue;
            }

            var age = today.Year - person.BirthDate!.Value.Year;

            await emailService.SendBirthdayEmailAsync(person.Email!,
                $"{person.FirstName} {person.LastName}", age);

            // Log kaydı — duplicate önlemek için
            db.BirthdayLogs.Add(new BirthdayLog
            {
                PersonId = person.Id,
                Year = currentYear
            });
            await db.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Doğum günü kontrolü tamamlandı.");
    }
}
