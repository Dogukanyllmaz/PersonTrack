namespace PersonTrack.API.Models;

public class PersonTask
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public Person? Person { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Active"; // "Active", "Completed"
    public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High", "Critical"
    public DateTime AssignedDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
}
