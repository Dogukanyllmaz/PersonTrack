using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.Tests.Helpers;

public static class TestDbFactory
{
    public static AppDbContext Create(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    public static AppDbContext CreateWithSeedData(string? dbName = null)
    {
        var db = Create(dbName ?? Guid.NewGuid().ToString());

        // Seed admin user
        var admin = new User
        {
            Id = 1,
            Username = "admin",
            Email = "admin@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = "Admin",
            IsActive = true
        };

        // Seed manager user
        var manager = new User
        {
            Id = 2,
            Username = "manager",
            Email = "manager@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager123!"),
            Role = "Manager",
            IsActive = true
        };

        // Seed regular user
        var regularUser = new User
        {
            Id = 3,
            Username = "user1",
            Email = "user1@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
            Role = "User",
            IsActive = true,
            PersonId = 1
        };

        // Seed inactive user
        var inactiveUser = new User
        {
            Id = 4,
            Username = "inactive",
            Email = "inactive@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Inactive123!"),
            Role = "User",
            IsActive = false
        };

        db.Users.AddRange(admin, manager, regularUser, inactiveUser);

        // Seed persons
        var person1 = new Person
        {
            Id = 1,
            FirstName = "Ahmet",
            LastName = "Yılmaz",
            Email = "ahmet@test.com",
            Phone = "5551234567",
            Organization = "Test Corp",
            CurrentPosition = "Developer",
            CreatedById = 1
        };

        var person2 = new Person
        {
            Id = 2,
            FirstName = "Ayşe",
            LastName = "Kaya",
            Email = "ayse@test.com",
            Organization = "Test Corp",
            CreatedById = 1
        };

        db.Persons.AddRange(person1, person2);

        // Seed meetings
        var meeting1 = new Meeting
        {
            Id = 1,
            Title = "Proje Değerlendirme",
            Content = "Q1 değerlendirme toplantısı",
            MeetingDate = DateTime.UtcNow.AddDays(1),
            Status = "Planned",
            CreatedById = 1
        };

        var meeting2 = new Meeting
        {
            Id = 2,
            Title = "Tamamlanmış Toplantı",
            MeetingDate = DateTime.UtcNow.AddDays(-5),
            Status = "Completed",
            CreatedById = 1
        };

        db.Meetings.AddRange(meeting1, meeting2);

        // Seed meeting participants
        db.MeetingParticipants.Add(new MeetingParticipant { MeetingId = 1, PersonId = 1 });

        // Seed tasks
        var task1 = new PersonTask
        {
            Id = 1,
            PersonId = 1,
            Title = "Rapor Hazırla",
            Description = "Aylık rapor",
            Priority = "High",
            Status = "Active",
            AssignedDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(7),
            CreatedById = 1
        };

        var task2 = new PersonTask
        {
            Id = 2,
            PersonId = 1,
            Title = "Toplantı Notları",
            Priority = "Medium",
            Status = "Active",
            AssignedDate = DateTime.UtcNow.AddDays(-3),
            DueDate = DateTime.UtcNow.AddDays(-1), // overdue
            CreatedById = 2
        };

        var task3 = new PersonTask
        {
            Id = 3,
            PersonId = 2,
            Title = "Tamamlanmış Görev",
            Priority = "Low",
            Status = "Completed",
            AssignedDate = DateTime.UtcNow.AddDays(-10),
            CompletedDate = DateTime.UtcNow.AddDays(-2),
            CreatedById = 1
        };

        db.PersonTasks.AddRange(task1, task2, task3);

        // Seed tags
        var tag1 = new Tag { Id = 1, Name = "VIP", Color = "#ef4444", CreatedById = 1 };
        var tag2 = new Tag { Id = 2, Name = "Tedarikçi", Color = "#3b82f6", CreatedById = 1 };
        db.Tags.AddRange(tag1, tag2);

        // Seed notifications
        var notif1 = new Notification
        {
            Id = 1,
            UserId = 1,
            Title = "Test Bildirimi",
            Message = "Bu bir test bildirimidir",
            Type = "system",
            IsRead = false
        };

        var notif2 = new Notification
        {
            Id = 2,
            UserId = 1,
            Title = "Okunmuş Bildirim",
            Message = "Bu bildirim okundu",
            Type = "task_assigned",
            IsRead = true
        };

        var notif3 = new Notification
        {
            Id = 3,
            UserId = 2,
            Title = "Manager Bildirimi",
            Message = "Manager için bildirim",
            Type = "system",
            IsRead = false
        };

        db.Notifications.AddRange(notif1, notif2, notif3);

        // Seed reminders
        var reminder1 = new Reminder
        {
            Id = 1,
            Title = "Haftalık Kontrol",
            Notes = "Haftalık takip",
            ReminderDate = DateTime.UtcNow.AddDays(3),
            IsRecurring = true,
            RecurringIntervalDays = 7,
            CreatedById = 1,
            IsCompleted = false
        };

        db.Reminders.Add(reminder1);

        // Seed activity logs
        db.ActivityLogs.Add(new ActivityLog
        {
            Id = 1,
            UserId = 1,
            EntityType = "Person",
            EntityId = 1,
            EntityName = "Ahmet Yılmaz",
            Action = "Create",
            Details = "Kişi oluşturuldu"
        });

        db.SaveChanges();
        return db;
    }
}
