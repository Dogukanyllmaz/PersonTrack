namespace PersonTrack.API.Models;

public class MeetingLink
{
    public int Id { get; set; }
    public int MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public int LinkedMeetingId { get; set; }
    public Meeting? LinkedMeeting { get; set; }
    public string? LinkType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
