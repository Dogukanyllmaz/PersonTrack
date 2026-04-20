using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Helpers;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class ExportController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExportController(AppDbContext db) => _db = db;

    [HttpGet("persons")]
    public async Task<IActionResult> ExportPersons()
    {
        var persons = await _db.Persons
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .ToListAsync();

        var headers = new[] { "Ad", "Soyad", "Email", "Telefon", "Pozisyon", "Kurum", "Doğum Tarihi", "Adres", "Notlar", "Kayıt Tarihi" };
        var rows = persons.Select(p => new[]
        {
            p.FirstName, p.LastName, p.Email ?? "", p.Phone ?? "",
            p.Position?.Name ?? "", p.Organization ?? "",
            p.BirthDate?.ToString("dd.MM.yyyy") ?? "",
            p.Address ?? "", p.Notes ?? "",
            p.CreatedAt.ToString("dd.MM.yyyy")
        }).ToList();

        var bytes = ExcelHelper.CreateXlsx(headers, rows);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"kisiler_{DateTime.Today:yyyyMMdd}.xlsx");
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> ExportTasks()
    {
        var tasks = await _db.PersonTasks
            .Include(t => t.Person)
            .Include(t => t.CreatedBy)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var headers = new[] { "Görev", "Açıklama", "Kişi", "Öncelik", "Durum", "Atanma Tarihi", "Son Tarih", "Tamamlanma", "Oluşturan" };
        var rows = tasks.Select(t => new[]
        {
            t.Title, t.Description ?? "",
            t.Person != null ? t.Person.FirstName + " " + t.Person.LastName : "",
            t.Priority, t.Status,
            t.AssignedDate.ToString("dd.MM.yyyy"),
            t.DueDate?.ToString("dd.MM.yyyy") ?? "",
            t.CompletedDate?.ToString("dd.MM.yyyy") ?? "",
            t.CreatedBy?.Username ?? ""
        }).ToList();

        var bytes = ExcelHelper.CreateXlsx(headers, rows);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"gorevler_{DateTime.Today:yyyyMMdd}.xlsx");
    }

    [HttpGet("meetings")]
    public async Task<IActionResult> ExportMeetings()
    {
        var meetings = await _db.Meetings
            .Include(m => m.Participants).ThenInclude(p => p.Person)
            .OrderByDescending(m => m.MeetingDate)
            .ToListAsync();

        var headers = new[] { "Başlık", "Tarih", "Durum", "Katılımcılar", "İçerik" };
        var rows = meetings.Select(m => new[]
        {
            m.Title,
            m.MeetingDate.ToString("dd.MM.yyyy HH:mm"),
            m.Status,
            string.Join(", ", m.Participants.Select(p => p.Person != null ? p.Person.FirstName + " " + p.Person.LastName : "")),
            m.Content ?? ""
        }).ToList();

        var bytes = ExcelHelper.CreateXlsx(headers, rows);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"toplantilar_{DateTime.Today:yyyyMMdd}.xlsx");
    }
}
