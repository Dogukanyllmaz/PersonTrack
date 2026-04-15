using System.ComponentModel.DataAnnotations;

namespace PersonTrack.API.DTOs;

public record PersonCreateRequest(
    [Required(ErrorMessage = "Ad zorunludur.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Ad en fazla 100 karakter olabilir.")]
    string FirstName,

    [Required(ErrorMessage = "Soyad zorunludur.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Soyad en fazla 100 karakter olabilir.")]
    string LastName,

    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz.")]
    string? Email,

    [Phone(ErrorMessage = "Geçerli bir telefon numarası giriniz.")]
    string? Phone,

    string? Address,
    string? Notes,

    [StringLength(200, ErrorMessage = "Pozisyon en fazla 200 karakter olabilir.")]
    string? CurrentPosition,

    [StringLength(200, ErrorMessage = "Organizasyon en fazla 200 karakter olabilir.")]
    string? Organization,

    string? Password,
    DateTime? BirthDate
);

public record PersonUpdateRequest(
    [Required(ErrorMessage = "Ad zorunludur.")]
    [StringLength(100, MinimumLength = 1)]
    string FirstName,

    [Required(ErrorMessage = "Soyad zorunludur.")]
    [StringLength(100, MinimumLength = 1)]
    string LastName,

    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz.")]
    string? Email,

    [Phone(ErrorMessage = "Geçerli bir telefon numarası giriniz.")]
    string? Phone,

    string? Address,
    string? Notes,

    [StringLength(200)]
    string? CurrentPosition,

    [StringLength(200)]
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

public record AddRelationshipRequest(
    int RelatedPersonId,
    [Required(ErrorMessage = "İlişki türü zorunludur.")] string RelationshipType,
    string? Notes
);

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
