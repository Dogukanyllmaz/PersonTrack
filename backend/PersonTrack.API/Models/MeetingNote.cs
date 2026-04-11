namespace PersonTrack.API.Models;

public class MeetingNote
{
    public int Id { get; set; }
    public int MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public int? PersonId { get; set; }     // Who spoke (nullable = general note)
    public Person? Person { get; set; }
    public string Content { get; set; } = string.Empty;
    public TimeSpan? MinuteMarker { get; set; }  // e.g. 00:05:30 = at 5 min 30 sec
    public int OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
