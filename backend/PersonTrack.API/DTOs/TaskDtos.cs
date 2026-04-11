namespace PersonTrack.API.DTOs;

public record TaskCreateRequest(
    int PersonId,
    string Title,
    string? Description,
    DateTime AssignedDate
);

public record TaskUpdateRequest(
    string Title,
    string? Description,
    string Status,
    DateTime AssignedDate,
    DateTime? CompletedDate
);

public class TaskResponse
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AssignedDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
