namespace GrantMcpLayer.Services;

public class ClearOldConsentsHostedService(IServiceProvider serviceProvider) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var oldRecords = dbContext.ToolActivationConsents
                .Where(consent => consent.ValidUntil < DateTime.UtcNow);
            
            dbContext.ToolActivationConsents.RemoveRange(oldRecords);
            
            await dbContext.SaveChangesAsync(stoppingToken);
            
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}