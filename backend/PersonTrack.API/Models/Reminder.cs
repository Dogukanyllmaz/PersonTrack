namespace PersonTrack.API.Models;

public class Reminder
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime ReminderDate { get; set; }
    public bool IsRecurring { get; set; } = false;
    public int? RecurringIntervalDays { get; set; }
    public int? PersonId { get; set; }
    public Person? Person { get; set; }
    public int? MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public bool IsSent { get; set; } = false;
    public bool IsCompleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
