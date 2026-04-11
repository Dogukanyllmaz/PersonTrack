namespace PersonTrack.API.Models;

public class Meeting
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public DateTime MeetingDate { get; set; }
    public string Status { get; set; } = "Planned";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public ICollection<MeetingParticipant> Participants { get; set; } = new List<MeetingParticipant>();
    public ICollection<MeetingNote> Notes { get; set; } = new List<MeetingNote>();
    public ICollection<MeetingDocument> Documents { get; set; } = new List<MeetingDocument>();
    public ICollection<MeetingLink> LinksAsSource { get; set; } = new List<MeetingLink>();
    public ICollection<MeetingLink> LinksAsTarget { get; set; } = new List<MeetingLink>();
    public ICollection<MeetingTag> Tags { get; set; } = new List<MeetingTag>();
}
