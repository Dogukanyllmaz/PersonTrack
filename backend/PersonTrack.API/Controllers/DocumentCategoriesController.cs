using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.DTOs;
using PersonTrack.API.Models;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentCategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public DocumentCategoriesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _db.DocumentCategories
            .Select(c => new { c.Id, c.Name, c.Description, DocumentCount = c.PersonDocuments.Count })
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] DocumentCategoryRequest req)
    {
        if (await _db.DocumentCategories.AnyAsync(c => c.Name == req.Name))
            return BadRequest(new { message = "Bu isimde kategori zaten var." });

        var category = new DocumentCategory
        {
            Name = req.Name,
            Description = req.Description,
            CreatedById = CurrentUserId
        };
        _db.DocumentCategories.Add(category);
        await _db.SaveChangesAsync();
        return Ok(new { category.Id, category.Name, category.Description });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] DocumentCategoryRequest req)
    {
        var category = await _db.DocumentCategories.FindAsync(id);
        if (category == null) return NotFound();

        if (await _db.DocumentCategories.AnyAsync(c => c.Name == req.Name && c.Id != id))
            return BadRequest(new { message = "Bu isimde başka bir kategori zaten var." });

        category.Name = req.Name;
        category.Description = req.Description;
        category.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { category.Id, category.Name, category.Description });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.DocumentCategories.FindAsync(id);
        if (category == null) return NotFound();
        _db.DocumentCategories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record DocumentCategoryRequest(string Name, string? Description);
