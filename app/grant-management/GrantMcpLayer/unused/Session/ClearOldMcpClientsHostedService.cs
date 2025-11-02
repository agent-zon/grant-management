
namespace GrantMcpLayer.unused.Session;

public class ClearOldMcpClientsHostedService(IMcpClientSessionsStorage sessionsStorage) : BackgroundService
{
    private static readonly TimeSpan ClearOldClientsInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan MaxAgeForMcpClients = TimeSpan.FromHours(1);
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        
        while (stoppingToken.IsCancellationRequested)
        {
            var oldSession = sessionsStorage.GetAllSessions()
                .Where(pair => pair.Value.LastAccessed + MaxAgeForMcpClients < DateTime.UtcNow);

            foreach (var pair in oldSession)
            {
                await sessionsStorage.RemoveSession(pair.Key, pair.Value);
            }
            
            await Task.Delay(ClearOldClientsInterval, stoppingToken);
        }
    }
}