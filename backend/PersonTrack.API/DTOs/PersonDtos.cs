namespace PersonTrack.API.DTOs;

public record PersonCreateRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Address,
    string? Notes,
    string? CurrentPosition,
    string? Organization,
    string? Password,
    DateTime? BirthDate
);

public record PersonUpdateRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Address,
    string? Notes,
    string? CurrentPosition,
    string? Organization,
    DateTime? BirthDate
);

public class PersonResponse
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public string? CurrentPosition { get; set; }
    public string? Organization { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? BirthDate { get; set; }
    public int? Age { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<RelationshipResponse> Relationships { get; set; } = new();
    public List<PersonDocumentResponse> Documents { get; set; } = new();
    public List<PersonTagResponse> Tags { get; set; } = new();
}

public class RelationshipResponse
{
    public int Id { get; set; }
    public int RelatedPersonId { get; set; }
    public string RelatedPersonName { get; set; } = string.Empty;
    public string RelationshipType { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsReverse { get; set; }
}

public record AddRelationshipRequest(int RelatedPersonId, string RelationshipType, string? Notes);

public class PersonTagResponse
{
    public int TagId { get; set; }
    public TagInfoResponse? Tag { get; set; }
}

public class TagInfoResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366f1";
}

public class PersonDocumentResponse
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
}
