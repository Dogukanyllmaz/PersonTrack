namespace PersonTrack.API.Models;

public class PersonRelationship
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public Person? Person { get; set; }
    public int RelatedPersonId { get; set; }
    public Person? RelatedPerson { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
