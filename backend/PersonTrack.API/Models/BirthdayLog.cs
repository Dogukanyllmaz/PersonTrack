namespace PersonTrack.API.Models;

public class BirthdayLog
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public Person? Person { get; set; }
    public int Year { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
