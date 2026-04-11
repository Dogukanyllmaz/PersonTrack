namespace PersonTrack.API.Models;

public class TaskComment
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public PersonTask? Task { get; set; }
    public string Content { get; set; } = string.Empty;
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
