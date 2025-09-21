using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using GrantManagementServer.Entities; 

namespace GrantManagementServer;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public required DbSet<ToolPolicyEntity> ToolActivationPolicy { get; set; }
    public DbSet<GrantEntity> Grants => Set<GrantEntity>();
    public DbSet<GrantRequestEntity> GrantRequests => Set<GrantRequestEntity>();
    public DbSet<AuditLogEntity> AuditLogs => Set<AuditLogEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<ToolPolicyEntity>(entity =>
        {
            entity.ToTable("tool_activation_policy");
            entity.HasKey(x => new { x.AgentId, x.ToolName });
            entity.OwnsOne(x => x.ExplicitConsentPolicy);
        });

        builder.Entity<GrantEntity>(e =>
        {
            e.ToTable("grants");
            e.HasKey(g => g.Id);
            e.HasIndex(g => g.SessionId).HasDatabaseName("ix_grants_session_id");
            e.HasIndex(g => g.Status).HasDatabaseName("ix_grants_status");
        });

        var listToStringConverter = new ValueConverter<List<string>, string>(
            v => string.Join("|", v),
            v => v.Length == 0 ? new List<string>() : v.Split('|', StringSplitOptions.RemoveEmptyEntries).ToList());

        builder.Entity<GrantRequestEntity>(e =>
        {
            e.ToTable("grant_requests");
            e.HasKey(c => c.Id);
            e.HasIndex(c => c.SessionId).HasDatabaseName("ix_grant_requests_session_id");
            e.Property(c => c.RequestedScopes).HasConversion(listToStringConverter);
            e.Property(c => c.Tools).HasConversion(listToStringConverter);
            e.Property(c => c.ApprovedScopes).HasConversion(listToStringConverter).IsRequired(false);
            e.Property(c => c.DeniedScopes).HasConversion(listToStringConverter).IsRequired(false);
        });

        builder.Entity<AuditLogEntity>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.GrantId).HasDatabaseName("ix_audit_logs_grant_id");
            e.HasIndex(a => a.Action).HasDatabaseName("ix_audit_logs_action");
            e.HasIndex(a => a.Timestamp).HasDatabaseName("ix_audit_logs_timestamp");
        });

        base.OnModelCreating(builder);
    }
}