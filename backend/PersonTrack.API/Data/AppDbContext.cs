using Microsoft.EntityFrameworkCore;
using PersonTrack.API.Models;

namespace PersonTrack.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<PersonRelationship> PersonRelationships => Set<PersonRelationship>();
    public DbSet<PersonDocument> PersonDocuments => Set<PersonDocument>();
    public DbSet<DocumentCategory> DocumentCategories => Set<DocumentCategory>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<MeetingParticipant> MeetingParticipants => Set<MeetingParticipant>();
    public DbSet<MeetingNote> MeetingNotes => Set<MeetingNote>();
    public DbSet<MeetingDocument> MeetingDocuments => Set<MeetingDocument>();
    public DbSet<MeetingLink> MeetingLinks => Set<MeetingLink>();
    public DbSet<PersonTask> PersonTasks => Set<PersonTask>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<BirthdayLog> BirthdayLogs => Set<BirthdayLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<PersonTag> PersonTags => Set<PersonTag>();
    public DbSet<MeetingTag> MeetingTags => Set<MeetingTag>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<Person>(e =>
        {
            e.HasOne(p => p.CreatedBy)
             .WithMany()
             .HasForeignKey(p => p.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(p => p.Position)
             .WithMany(pos => pos.Persons)
             .HasForeignKey(p => p.PositionId)
             .OnDelete(DeleteBehavior.SetNull)
             .IsRequired(false);
        });

        modelBuilder.Entity<Position>(e =>
        {
            e.HasOne(pos => pos.CreatedBy)
             .WithMany()
             .HasForeignKey(pos => pos.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(pos => pos.Name).IsUnique();
        });

        modelBuilder.Entity<PersonRelationship>(e =>
        {
            e.HasOne(r => r.Person)
             .WithMany(p => p.RelationshipsAsSource)
             .HasForeignKey(r => r.PersonId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.RelatedPerson)
             .WithMany(p => p.RelationshipsAsTarget)
             .HasForeignKey(r => r.RelatedPersonId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PersonDocument>(e =>
        {
            e.HasOne(d => d.Person)
             .WithMany(p => p.Documents)
             .HasForeignKey(d => d.PersonId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(d => d.Category)
             .WithMany(c => c.PersonDocuments)
             .HasForeignKey(d => d.CategoryId)
             .OnDelete(DeleteBehavior.SetNull)
             .IsRequired(false);

            e.HasOne(d => d.UploadedBy)
             .WithMany()
             .HasForeignKey(d => d.UploadedById)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DocumentCategory>(e =>
        {
            e.HasOne(dc => dc.CreatedBy)
             .WithMany()
             .HasForeignKey(dc => dc.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(dc => dc.Name).IsUnique();
        });

        modelBuilder.Entity<Meeting>(e =>
        {
            e.HasOne(m => m.CreatedBy)
             .WithMany()
             .HasForeignKey(m => m.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MeetingParticipant>(e =>
        {
            e.HasIndex(mp => new { mp.MeetingId, mp.PersonId }).IsUnique();

            e.HasOne(mp => mp.Meeting)
             .WithMany(m => m.Participants)
             .HasForeignKey(mp => mp.MeetingId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(mp => mp.Person)
             .WithMany(p => p.MeetingParticipants)
             .HasForeignKey(mp => mp.PersonId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MeetingNote>(e =>
        {
            e.HasOne(n => n.Meeting)
             .WithMany(m => m.Notes)
             .HasForeignKey(n => n.MeetingId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(n => n.Person)
             .WithMany(p => p.MeetingNotes)
             .HasForeignKey(n => n.PersonId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MeetingDocument>(e =>
        {
            e.HasOne(d => d.Meeting)
             .WithMany(m => m.Documents)
             .HasForeignKey(d => d.MeetingId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(d => d.UploadedBy)
             .WithMany()
             .HasForeignKey(d => d.UploadedById)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MeetingLink>(e =>
        {
            e.HasOne(l => l.Meeting)
             .WithMany(m => m.LinksAsSource)
             .HasForeignKey(l => l.MeetingId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.LinkedMeeting)
             .WithMany(m => m.LinksAsTarget)
             .HasForeignKey(l => l.LinkedMeetingId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // User optional PersonId — one user can be linked to one person
        modelBuilder.Entity<User>(e =>
        {
            e.HasOne(u => u.Person)
             .WithMany()
             .HasForeignKey(u => u.PersonId)
             .OnDelete(DeleteBehavior.SetNull)
             .IsRequired(false);
        });

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PersonTask>(e =>
        {
            e.HasOne(t => t.Person)
             .WithMany(p => p.Tasks)
             .HasForeignKey(t => t.PersonId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.CreatedBy)
             .WithMany()
             .HasForeignKey(t => t.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BirthdayLog>(e =>
        {
            e.HasOne(b => b.Person)
             .WithMany()
             .HasForeignKey(b => b.PersonId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(b => new { b.PersonId, b.Year }).IsUnique();
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.User)
             .WithMany()
             .HasForeignKey(n => n.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityLog>(e =>
        {
            e.HasOne(a => a.User)
             .WithMany()
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Tag>(e =>
        {
            e.HasOne(t => t.CreatedBy)
             .WithMany()
             .HasForeignKey(t => t.CreatedById)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(t => t.Name).IsUnique();
        });

        modelBuilder.Entity<PersonTag>(e =>
        {
            e.HasKey(pt => new { pt.PersonId, pt.TagId });
            e.HasOne(pt => pt.Person).WithMany(p => p.Tags).HasForeignKey(pt => pt.PersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(pt => pt.Tag).WithMany(t => t.PersonTags).HasForeignKey(pt => pt.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MeetingTag>(e =>
        {
            e.HasKey(mt => new { mt.MeetingId, mt.TagId });
            e.HasOne(mt => mt.Meeting).WithMany(m => m.Tags).HasForeignKey(mt => mt.MeetingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(mt => mt.Tag).WithMany(t => t.MeetingTags).HasForeignKey(mt => mt.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Reminder>(e =>
        {
            e.HasOne(r => r.CreatedBy).WithMany().HasForeignKey(r => r.CreatedById).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(r => r.Person).WithMany().HasForeignKey(r => r.PersonId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
            e.HasOne(r => r.Meeting).WithMany().HasForeignKey(r => r.MeetingId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        });

        modelBuilder.Entity<TaskComment>(e =>
        {
            e.HasOne(c => c.Task).WithMany(t => t.Comments).HasForeignKey(c => c.TaskId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.CreatedBy).WithMany().HasForeignKey(c => c.CreatedById).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => r.Token).IsUnique();
        });

        modelBuilder.Entity<ConversationParticipant>(e =>
        {
            e.HasOne(cp => cp.Conversation).WithMany(c => c.Participants)
             .HasForeignKey(cp => cp.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(cp => cp.User).WithMany()
             .HasForeignKey(cp => cp.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(cp => new { cp.ConversationId, cp.UserId }).IsUnique();
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasOne(m => m.Conversation).WithMany(c => c.Messages)
             .HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Sender).WithMany()
             .HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
