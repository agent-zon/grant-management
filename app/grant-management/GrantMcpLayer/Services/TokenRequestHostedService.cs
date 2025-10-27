using System.Collections.Concurrent;
using System.Threading.Channels;
using Duende.IdentityModel.Client;
using GrantMcpLayer.Models;

namespace GrantMcpLayer.Services;

public class TokenRequestHostedService(
    ChannelReader<DeviceFlowAuthRequestedEvent> reader,
    IServiceProvider serviceProvider,
    IHttpClientFactory httpClientFactory,
    ILogger<TokenRequestHostedService> logger) : BackgroundService
{
    private readonly ConcurrentDictionary<Guid, Task<(Guid TaskKey, IHeaderDictionary Headers, ToolActivationConsent? Result)>> _tasks = new();

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);

        await base.StartAsync(cancellationToken);
    }


    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        
        async Task ReadingTask(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                var deviceFlowAuthRequestedEvent = await reader.ReadAsync(ct);
                var taskKey = Guid.CreateVersion7();
                var task = AcquireToken(deviceFlowAuthRequestedEvent, ct)
                    .WithTaskKeyAndHttpHeaders(taskKey, deviceFlowAuthRequestedEvent.HttpHeaders);
                _tasks.TryAdd(taskKey, task);
            }
        }

        async Task WriterTask(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                if (_tasks.IsEmpty)
                {
                    await Task.Delay(1000, ct);
                    continue;
                }
                
                var winner = await Task.WhenAny(_tasks.Values);
                var (taskKey, originalHeaders, tokenResult) = await winner;
                _tasks.Remove(taskKey, out var _);
                if (tokenResult != null)
                {
                    await WriteResultToDbAsync(tokenResult, ct);
                }
            }
        }

        await Task.WhenAll(ReadingTask(stoppingToken), WriterTask(stoppingToken));
    }

    private async Task WriteResultToDbAsync(ToolActivationConsent tokenResult, CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var oldConsent = dbContext.ToolActivationConsents.FirstOrDefault(c =>
            c.AgentId == tokenResult.AgentId &&
            c.ToolName == tokenResult.ToolName &&
            c.ConversationId == tokenResult.ConversationId &&
            c.UserId == tokenResult.UserId
        );
            
        if (oldConsent != null)
        {
            oldConsent.ValidUntil = tokenResult.ValidUntil;
            dbContext.ToolActivationConsents.Update(oldConsent);
        }
        else
        {
            dbContext.ToolActivationConsents.Add(tokenResult);
        }
            
        await dbContext.SaveChangesAsync(ct);
    }

    private async Task<ToolActivationConsent?> AcquireToken(DeviceFlowAuthRequestedEvent prompt, CancellationToken ct = default)
    {
        try
        {
            var delay = 1000;
            var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromMinutes(5));
            var token = cts.Token;
            while (!token.IsCancellationRequested)
            {
                var tokenResult = await httpClientFactory.CreateClient()
                    .RequestDeviceTokenAsync(prompt.TokenRequest, token);
                
                if (!tokenResult.IsError)
                {
                    return new ToolActivationConsent
                    {
                        AgentId = prompt.HttpHeaders.ExtractAgentId(),
                        ConversationId = prompt.HttpHeaders.ExtractConversationId(),
                        ToolName = prompt.ToolName,
                        UserId = prompt.HttpHeaders.ExtractJwtFromAuthorization().Subject,
                        ValidUntil = prompt.ConsentExpiration
                    };
                }

                if (tokenResult.IsError && tokenResult.ErrorType == ResponseErrorType.Protocol)
                {
                    if (tokenResult.Error == "slow_down")
                    {
                        delay += 500;
                    }
                    else if (tokenResult.Error == "access_denied")
                    {
                        // user denied the consent
                        return null;
                    }
                    else if (tokenResult.Error == "expired_token")
                    {
                        // the device code expired
                        return null;
                    }
                }

                await Task.Delay(delay, token);
            }
            
            return null;
        }
        catch (Exception e)
        {
            logger.LogError(e, "Error while aquiring token");
            return null;
        }
    }
}