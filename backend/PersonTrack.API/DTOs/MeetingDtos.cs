using System.ComponentModel.DataAnnotations;

namespace PersonTrack.API.DTOs;

public record MeetingCreateRequest(
    [Required(ErrorMessage = "Toplantı başlığı zorunludur.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Başlık 3-200 karakter arasında olmalıdır.")]
    string Title,

    string? Content,

    [Required(ErrorMessage = "Toplantı tarihi zorunludur.")]
    DateTime MeetingDate,

    List<int> ParticipantIds
);

public record MeetingUpdateRequest(
    [Required(ErrorMessage = "Toplantı başlığı zorunludur.")]
    [StringLength(200, MinimumLength = 3)]
    string Title,

    string? Content,

    [Required(ErrorMessage = "Toplantı tarihi zorunludur.")]
    DateTime MeetingDate,

    List<int> ParticipantIds
);

public class MeetingResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public DateTime MeetingDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<ParticipantResponse> Participants { get; set; } = new();
    public List<MeetingNoteResponse> Notes { get; set; } = new();
    public List<MeetingDocumentResponse> Documents { get; set; } = new();
    public List<MeetingLinkResponse> LinkedMeetings { get; set; } = new();
    public List<MeetingTagResponse> Tags { get; set; } = new();
}

public class MeetingTagResponse
{
    public int TagId { get; set; }
    public TagInfoResponse? Tag { get; set; }
}

public class ParticipantResponse
{
    public int PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
}

public class MeetingNoteResponse
{
    public int Id { get; set; }
    public int? PersonId { get; set; }
    public string? PersonName { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? MinuteMarker { get; set; }
    public int OrderIndex { get; set; }
}

public record MeetingNoteCreateRequest(
    int? PersonId,
    [Required(ErrorMessage = "Not içeriği zorunludur.")] string Content,
    string? MinuteMarker,
    int OrderIndex
);

public class MeetingDocumentResponse
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
}

public class MeetingLinkResponse
{
    public int Id { get; set; }
    public int LinkedMeetingId { get; set; }
    public string LinkedMeetingTitle { get; set; } = string.Empty;
    public DateTime LinkedMeetingDate { get; set; }
    public string? LinkType { get; set; }
    public bool IsReverse { get; set; }
}

public record AddMeetingLinkRequest(int LinkedMeetingId, string? LinkType);

/// <summary>One row of a confirmed import (personId already resolved by the user).</summary>
public record ConfirmedNoteRowDto(int? PersonId, string Content, string? MinuteMarker);
