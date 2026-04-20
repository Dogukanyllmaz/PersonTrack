using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PositionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public PositionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var positions = await _db.Positions
            .Select(p => new { p.Id, p.Name, p.Description, PersonCount = p.Persons.Count })
            .OrderBy(p => p.Name)
            .ToListAsync();
        return Ok(positions);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] PositionRequest req)
    {
        if (await _db.Positions.AnyAsync(p => p.Name == req.Name))
            return BadRequest(new { message = "Bu isimde pozisyon zaten var." });

        var position = new Position
        {
            Name = req.Name,
            Description = req.Description,
            CreatedById = CurrentUserId
        };
        _db.Positions.Add(position);
        await _db.SaveChangesAsync();
        return Ok(new { position.Id, position.Name, position.Description });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] PositionRequest req)
    {
        var position = await _db.Positions.FindAsync(id);
        if (position == null) return NotFound();

        if (await _db.Positions.AnyAsync(p => p.Name == req.Name && p.Id != id))
            return BadRequest(new { message = "Bu isimde başka bir pozisyon zaten var." });

        position.Name = req.Name;
        position.Description = req.Description;
        position.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { position.Id, position.Name, position.Description });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var position = await _db.Positions.FindAsync(id);
        if (position == null) return NotFound();
        _db.Positions.Remove(position);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record PositionRequest(string Name, string? Description);
