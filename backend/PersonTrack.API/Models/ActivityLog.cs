namespace PersonTrack.API.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string EntityType { get; set; } = string.Empty; // Person, Meeting, Task, User
    public int? EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Created, Updated, Deleted
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
