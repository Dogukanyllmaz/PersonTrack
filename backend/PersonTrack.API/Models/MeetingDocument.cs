namespace PersonTrack.API.Models;

public class MeetingDocument
{
    public int Id { get; set; }
    public int MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int UploadedById { get; set; }
    public User? UploadedBy { get; set; }
}
