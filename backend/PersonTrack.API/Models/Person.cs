namespace PersonTrack.API.Models;

public class Person
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public string? CurrentPosition { get; set; }
    public string? Organization { get; set; }
    public string? PhotoFileName { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public ICollection<PersonRelationship> RelationshipsAsSource { get; set; } = new List<PersonRelationship>();
    public ICollection<PersonRelationship> RelationshipsAsTarget { get; set; } = new List<PersonRelationship>();
    public ICollection<MeetingParticipant> MeetingParticipants { get; set; } = new List<MeetingParticipant>();
    public ICollection<MeetingNote> MeetingNotes { get; set; } = new List<MeetingNote>();
    public ICollection<PersonTask> Tasks { get; set; } = new List<PersonTask>();
    public ICollection<PersonDocument> Documents { get; set; } = new List<PersonDocument>();
    public ICollection<PersonTag> Tags { get; set; } = new List<PersonTag>();
}
