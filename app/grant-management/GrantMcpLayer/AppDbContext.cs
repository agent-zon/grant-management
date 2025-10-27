using GrantMcpLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace GrantMcpLayer;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public required DbSet<ToolActivationConsent> ToolActivationConsents { get; set; }
    
    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<ToolActivationConsent>(entity =>
        {
            entity.ToTable("tool_activation_consents");
            entity.HasKey(x => new { x.AgentId, x.ToolName, x.ConversationId, x.UserId});
        });
        
        base.OnModelCreating(builder);
    }
}
