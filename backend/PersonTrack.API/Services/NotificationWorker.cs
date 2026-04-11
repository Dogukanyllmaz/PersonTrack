using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;

namespace PersonTrack.API.Services;

public class NotificationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationWorker> _logger;

    public NotificationWorker(IServiceScopeFactory scopeFactory, ILogger<NotificationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Run every hour
            var now = DateTime.UtcNow;
            var nextRun = now.AddHours(1);
            await Task.Delay(nextRun - now, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            await CheckOverdueTasksAsync(stoppingToken);
            await CheckUpcomingMeetingsAsync(stoppingToken);
            await CheckRemindersAsync(stoppingToken);
        }
    }

    private async Task CheckOverdueTasksAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var overdue = await db.PersonTasks
            .Include(t => t.Person)
            .Where(t => t.Status == "Active"
                && t.DueDate.HasValue
                && t.DueDate.Value < DateTime.UtcNow)
            .ToListAsync(ct);

        foreach (var task in overdue)
        {
            // Notify admins and managers — check if notification already sent today
            var alreadyNotified = await db.Notifications
                .AnyAsync(n => n.Type == "task_overdue"
                    && n.Link == $"/tasks"
                    && n.Message.Contains(task.Title)
                    && n.CreatedAt.Date == DateTime.UtcNow.Date, ct);

            if (!alreadyNotified)
            {
                await notifService.CreateForRoleAsync("Manager",
                    "⚠️ Gecikmiş Görev",
                    $"'{task.Title}' görevi — {task.Person?.FirstName} {task.Person?.LastName} — süresi geçti.",
                    "task_overdue", "/tasks");
            }
        }
    }

    private async Task CheckUpcomingMeetingsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var meetings = await db.Meetings
            .Where(m => m.Status == "Planned"
                && m.MeetingDate.Date == tomorrow)
            .ToListAsync(ct);

        foreach (var meeting in meetings)
        {
            var alreadyNotified = await db.Notifications
                .AnyAsync(n => n.Type == "meeting_reminder"
                    && n.Link == $"/meetings/{meeting.Id}"
                    && n.CreatedAt.Date == DateTime.UtcNow.Date, ct);

            if (!alreadyNotified)
            {
                await notifService.CreateForRoleAsync("Manager",
                    "📅 Yarın Toplantı Var",
                    $"'{meeting.Title}' toplantısı yarın {meeting.MeetingDate:HH:mm}'de.",
                    "meeting_reminder", $"/meetings/{meeting.Id}");
            }
        }
    }

    private async Task CheckRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var now = DateTime.UtcNow;
        var reminders = await db.Reminders
            .Where(r => !r.IsCompleted && !r.IsSent && r.ReminderDate <= now)
            .ToListAsync(ct);

        foreach (var reminder in reminders)
        {
            await notifService.CreateAsync(reminder.CreatedById,
                $"🔔 {reminder.Title}",
                reminder.Notes ?? reminder.Title,
                "reminder",
                reminder.PersonId.HasValue ? $"/persons/{reminder.PersonId}" : null);

            if (reminder.IsRecurring && reminder.RecurringIntervalDays.HasValue)
            {
                reminder.ReminderDate = reminder.ReminderDate.AddDays(reminder.RecurringIntervalDays.Value);
                reminder.IsSent = false;
            }
            else
            {
                reminder.IsSent = true;
            }
        }

        if (reminders.Any())
            await db.SaveChangesAsync(ct);
    }
}
