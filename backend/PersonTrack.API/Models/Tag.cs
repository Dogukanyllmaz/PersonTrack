namespace PersonTrack.API.Models;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366f1"; // hex color
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PersonTag> PersonTags { get; set; } = new List<PersonTag>();
    public ICollection<MeetingTag> MeetingTags { get; set; } = new List<MeetingTag>();
}

public class PersonTag
{
    public int PersonId { get; set; }
    public Person? Person { get; set; }
    public int TagId { get; set; }
    public Tag? Tag { get; set; }
}

public class MeetingTag
{
    public int MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public int TagId { get; set; }
    public Tag? Tag { get; set; }
}
