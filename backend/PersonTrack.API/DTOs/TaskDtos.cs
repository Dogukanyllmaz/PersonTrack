using System.ComponentModel.DataAnnotations;

namespace PersonTrack.API.DTOs;

public record TaskCreateRequest(
    int PersonId,

    [Required(ErrorMessage = "Görev başlığı zorunludur.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Başlık 3-200 karakter arasında olmalıdır.")]
    string Title,

    string? Description,

    [Required(ErrorMessage = "Atanma tarihi zorunludur.")]
    DateTime AssignedDate,

    DateTime? DueDate,
    string Priority = "Medium"
);

public record TaskUpdateRequest(
    [Required(ErrorMessage = "Görev başlığı zorunludur.")]
    [StringLength(200, MinimumLength = 3)]
    string Title,

    string? Description,

    [Required(ErrorMessage = "Durum zorunludur.")]
    string Status,

    DateTime AssignedDate,
    DateTime? CompletedDate,
    DateTime? DueDate,
    string Priority = "Medium"
);

public class TaskResponse
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public DateTime AssignedDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<TaskCommentResponse> Comments { get; set; } = new();
}

public class TaskCommentResponse
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
