namespace PersonTrack.API.Models;

public class MeetingParticipant
{
    public int Id { get; set; }
    public int MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public int PersonId { get; set; }
    public Person? Person { get; set; }
}
