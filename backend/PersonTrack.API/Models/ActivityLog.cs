namespace PersonTrack.API.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string EntityType { get; set; } = string.Empty; // Person, Meeting, Task, User, Tag, Reminder
    public int? EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;     // Create, Update, Delete, Login, Complete, Import
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
