using GrantManagementServer;
using GrantManagementServer.Entities;

namespace MetadataServer.Services;

public class PoliciesSeederHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    public PoliciesSeederHostedService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    
    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var configuration = _serviceProvider.GetRequiredService<IConfiguration>();
        var toolsPolicies = configuration.GetSection("ToolsPolicies").Get<List<ToolPolicyEntity>>();
        var db = _serviceProvider.GetRequiredService<AppDbContext>();
        
        // Seed configured ToolPolicies if not present
        foreach (var toolPolicy in toolsPolicies ?? [])
        {
            if (!db.ToolActivationPolicy.Any(p => p.ToolName == toolPolicy.ToolName &&
                                                           p.AgentId == toolPolicy.AgentId))
            {
                db.ToolActivationPolicy.Add(toolPolicy);
            }
        }
        
        await db.SaveChangesAsync(stoppingToken);
    }
}
