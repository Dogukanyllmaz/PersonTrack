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
public class MessagesController : ControllerBase
{
    private readonly AppDbContext _db;

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public MessagesController(AppDbContext db) => _db = db;

    // ── GET /messages/conversations ────────────────────────────────────────
    /// <summary>List all conversations for the current user, ordered by last activity.</summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = CurrentUserId;

        var conversations = await _db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .Include(cp => cp.Conversation)
                .ThenInclude(c => c.Participants)
                    .ThenInclude(p => p.User)
            .Include(cp => cp.Conversation)
                .ThenInclude(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .ToListAsync();

        var result = conversations
            .Select(cp =>
            {
                var lastMsg    = cp.Conversation.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var otherUsers = cp.Conversation.Participants
                    .Where(p => p.UserId != userId)
                    .Select(p => new { p.User!.Id, p.User.Username, p.User.Email })
                    .ToList();

                var unreadCount = _db.Messages
                    .Count(m => m.ConversationId == cp.ConversationId
                             && !m.IsDeleted
                             && m.SenderId != userId
                             && m.CreatedAt > (cp.LastReadAt ?? DateTime.MinValue));

                return new
                {
                    ConversationId = cp.ConversationId,
                    OtherUsers     = otherUsers,
                    LastMessage    = lastMsg == null ? null : new
                    {
                        lastMsg.Id,
                        lastMsg.Content,
                        lastMsg.CreatedAt,
                        lastMsg.SenderId
                    },
                    UnreadCount   = unreadCount,
                    LastActivity  = lastMsg?.CreatedAt ?? cp.Conversation.CreatedAt
                };
            })
            .OrderByDescending(c => c.LastActivity)
            .ToList();

        return Ok(result);
    }

    // ── POST /messages/conversations ───────────────────────────────────────
    /// <summary>Start a new 1-on-1 conversation OR return existing one.</summary>
    [HttpPost("conversations")]
    public async Task<IActionResult> StartConversation([FromBody] int targetUserId)
    {
        var userId = CurrentUserId;

        if (userId == targetUserId)
            return BadRequest(new { message = "Kendinizle konuşma başlatamazsınız." });

        if (!await _db.Users.AnyAsync(u => u.Id == targetUserId))
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        // Check if a conversation with exactly these two participants already exists
        var existing = await _db.Conversations
            .Include(c => c.Participants)
            .Where(c => c.Participants.Count == 2
                     && c.Participants.Any(p => p.UserId == userId)
                     && c.Participants.Any(p => p.UserId == targetUserId))
            .FirstOrDefaultAsync();

        if (existing != null)
            return Ok(new { conversationId = existing.Id });

        var conversation = new Conversation();
        conversation.Participants.Add(new ConversationParticipant { UserId = userId });
        conversation.Participants.Add(new ConversationParticipant { UserId = targetUserId });

        _db.Conversations.Add(conversation);
        await _db.SaveChangesAsync();

        return Ok(new { conversationId = conversation.Id });
    }

    // ── GET /messages/conversations/{id}/messages ─────────────────────────
    /// <summary>Paginated message history for a conversation.</summary>
    [HttpGet("conversations/{id}/messages")]
    public async Task<IActionResult> GetMessages(int id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = CurrentUserId;

        var isParticipant = await _db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == id && cp.UserId == userId);
        if (!isParticipant) return Forbid();

        var total = await _db.Messages.CountAsync(m => m.ConversationId == id && !m.IsDeleted);

        var messages = await _db.Messages
            .Where(m => m.ConversationId == id && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(m => m.Sender)
            .Select(m => new
            {
                m.Id,
                m.ConversationId,
                m.Content,
                m.CreatedAt,
                SenderId   = m.SenderId,
                SenderName = m.Sender != null ? m.Sender.Username : "?"
            })
            .ToListAsync();

        // Return in ascending order for the UI
        return Ok(new { total, page, pageSize, messages = messages.OrderBy(m => m.CreatedAt) });
    }

    // ── DELETE /messages/{messageId} ──────────────────────────────────────
    /// <summary>Soft-delete own message.</summary>
    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(int messageId)
    {
        var userId = CurrentUserId;

        var msg = await _db.Messages.FindAsync(messageId);
        if (msg == null) return NotFound();
        if (msg.SenderId != userId) return Forbid();

        msg.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /messages/conversations/{id} ──────────────────────────────────
    /// <summary>Remove current user from a conversation (hides it from their list).</summary>
    [HttpDelete("conversations/{id}")]
    public async Task<IActionResult> DeleteConversation(int id)
    {
        var userId = CurrentUserId;

        var participant = await _db.ConversationParticipants
            .FirstOrDefaultAsync(cp => cp.ConversationId == id && cp.UserId == userId);

        if (participant == null) return NotFound();

        _db.ConversationParticipants.Remove(participant);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── GET /messages/unread-count ─────────────────────────────────────────
    /// <summary>Total unread messages across all conversations — used by nav badge.</summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = CurrentUserId;

        var myParticipations = await _db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .ToListAsync();

        var count = 0;
        foreach (var cp in myParticipations)
        {
            count += await _db.Messages.CountAsync(m =>
                m.ConversationId == cp.ConversationId
             && !m.IsDeleted
             && m.SenderId != userId
             && m.CreatedAt > (cp.LastReadAt ?? DateTime.MinValue));
        }

        return Ok(new { count });
    }

    // ── GET /messages/users ───────────────────────────────────────────────
    /// <summary>List of users to start a conversation with.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var userId = CurrentUserId;
        var users = await _db.Users
            .Where(u => u.IsActive && u.Id != userId)
            .OrderBy(u => u.Username)
            .Select(u => new { u.Id, u.Username, u.Email, u.Role })
            .ToListAsync();
        return Ok(users);
    }
}
