using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Data;
using PersonTrack.API.Models;

namespace PersonTrack.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db) => _db = db;

    private int CurrentUserId =>
        int.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── Connection lifecycle ───────────────────────────────────────────────
    public override async Task OnConnectedAsync()
    {
        // Each user joins their personal group — used for push delivery
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(CurrentUserId));
        await base.OnConnectedAsync();
    }

    // ── Client-callable methods ────────────────────────────────────────────

    /// <summary>Send a message to a conversation.</summary>
    public async Task SendMessage(int conversationId, string content)
    {
        content = content.Trim();
        if (string.IsNullOrEmpty(content)) return;

        var userId = CurrentUserId;

        var participant = await _db.ConversationParticipants
            .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);
        if (participant == null) return; // not a participant — silently ignore

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId       = userId,
            Content        = content,
            CreatedAt      = DateTime.UtcNow
        };
        _db.Messages.Add(msg);

        // Update sender's LastReadAt — they just wrote, so conversation is "read"
        participant.LastReadAt = msg.CreatedAt;

        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(userId);
        var payload = new
        {
            msg.Id,
            msg.ConversationId,
            msg.Content,
            msg.CreatedAt,
            SenderId   = userId,
            SenderName = sender?.Username ?? "?"
        };

        // Push to every participant's personal group
        var participantUserIds = await _db.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId)
            .Select(cp => cp.UserId)
            .ToListAsync();

        foreach (var uid in participantUserIds)
            await Clients.Group(UserGroup(uid)).SendAsync("ReceiveMessage", payload);
    }

    /// <summary>Mark all messages in a conversation as read for the current user.</summary>
    public async Task MarkRead(int conversationId)
    {
        var userId = CurrentUserId;

        var participant = await _db.ConversationParticipants
            .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

        if (participant != null)
        {
            participant.LastReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Tell the client that this conversation's unread count is now 0
        await Clients.Group(UserGroup(userId)).SendAsync("MessagesRead", new { conversationId });
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private static string UserGroup(int userId) => $"user_{userId}";
}
