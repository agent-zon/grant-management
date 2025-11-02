using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using MpcProxy.Common;

namespace GrantMcpLayer.unused;

public interface IMcpClientResolver : IAsyncDisposable
{
    Task<McpClient> ResolveAsync(
        McpServer? server = null,
        Dictionary<string, string>? additionalHeaders = null,
        McpClientOptions? clientOptions = null,
        ILoggerFactory? loggerFactory = null,
        CancellationToken ct = default);
    
    bool IsInitialized { get; }
}

public class McpClientResolver : IMcpClientResolver
{
    private static readonly HashSet<string> HeadersToPassOn = new(StringComparer.OrdinalIgnoreCase)
    {
        HeaderNames.Authorization,
        "aiam-session-id"
    };
    
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private readonly IOptions<McpServerInfo> _serverInfo;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IElicitationHandler _elicitationHandler;
    private readonly ILogger<McpClientResolver> _logger;
    private McpClient? _cachedClient = null;

    public McpClientResolver(
        IOptions<McpServerInfo> serverInfo,
        IElicitationHandler elicitationHandler,
        IHttpContextAccessor httpContextAccessor,
        ILogger<McpClientResolver> logger)
    {
        _serverInfo = serverInfo;
        _elicitationHandler = elicitationHandler;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<McpClient> CreateClientAsync(
        McpServer? server = null,
        Dictionary<string, string>? additionalHeaders = null,
        McpClientOptions? clientOptions = null,
        ILoggerFactory? loggerFactory = null,
        CancellationToken ct = default)
    {
        try
        {
            clientOptions ??= new();
            clientOptions.Capabilities ??= new();
            clientOptions.Capabilities.Elicitation ??= new();
            clientOptions.Capabilities.Elicitation.ElicitationHandler ??= (requestParams, cancellationToken) =>
                _elicitationHandler.HandleElicitationAsync(server, requestParams, cancellationToken);

            var transport = CreateTransport();
            return await McpClient.CreateAsync(transport, clientOptions, loggerFactory, ct);
        }
        catch (HttpRequestException e) when (e.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            if (server != null && !string.IsNullOrEmpty(additionalHeaders?.GetValueOrDefault(HeaderNames.Authorization)))
            {
                var authBearer = await ElicitForAuthBearerAsync(server, ct);
                if (authBearer is null)
                    throw;
                
                additionalHeaders ??= new();
                additionalHeaders[HeaderNames.Authorization] = authBearer;
                var updatedTransport = CreateTransport();
                return await McpClient.CreateAsync(updatedTransport, clientOptions, loggerFactory, ct);
            }

            throw;
        }

        IClientTransport CreateTransport()
        {
            var mergedHeaders = additionalHeaders?.ToDictionary() ?? new();
            var headers = _httpContextAccessor.HttpContext?.Request.Headers ?? new HeaderDictionary();
            foreach (var existingHeaders in headers )
            {
                if (!HeadersToPassOn.Contains(existingHeaders.Key))
                    continue;

                mergedHeaders.TryAdd(existingHeaders.Key, existingHeaders.Value.ToString());
            }
            
            return _serverInfo.Value.Type switch
            {
                Consts.McpTransportTypes.Stdio => new StdioClientTransport(new()
                {
                    Name = _serverInfo.Value.Name,
                    Command = _serverInfo.Value.Command,
                    Arguments = _serverInfo.Value.Arguments.Split(" "),
                    EnvironmentVariables = _serverInfo.Value.Environments,
                }),
                Consts.McpTransportTypes.Sse or Consts.McpTransportTypes.Http => new HttpClientTransport(new()
                {
                    Name = _serverInfo.Value.Name,
                    Endpoint = new Uri(_serverInfo.Value.Url),
                    AdditionalHeaders = mergedHeaders
                }),
                _ => throw new ArgumentOutOfRangeException()
            };
        }
    }

    public async Task<McpClient> ResolveAsync(
        McpServer? server = null,
        Dictionary<string, string>? additionalHeaders = null,
        McpClientOptions? clientOptions = null,
        ILoggerFactory? loggerFactory = null,
        CancellationToken ct = default)
    {
        if (_cachedClient == null)
        {
            try
            {
                await _semaphore.WaitAsync(ct);
                _cachedClient ??= await CreateClientAsync(
                    server, 
                    additionalHeaders,
                    clientOptions,
                    loggerFactory,
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to create MCP client for {McpServerName}: {Message}",
                    _serverInfo.Value.Name, 
                    ex.Message);
                throw;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        return _cachedClient;
    }

    public bool IsInitialized => _cachedClient != null;

    public async ValueTask DisposeAsync()
    {
        _semaphore.Dispose();
        if (_cachedClient != null)
            await _cachedClient.DisposeAsync();
    }

    public static async Task<string?> ElicitForAuthBearerAsync(McpServer server, CancellationToken ct = default)
    {
        var elicitResult = await server.ElicitAsync(new()
        {
            Message = Consts.InternalProxy.Elicitations.AuthBearerElicitationMessage,
            RequestedSchema = new ElicitRequestParams.RequestSchema
            {
                Properties = new Dictionary<string, ElicitRequestParams.PrimitiveSchemaDefinition>()
                {
                    [HeaderNames.Authorization] = new ElicitRequestParams.StringSchema()
                }
            }
        }, ct);

        return elicitResult.Action == "accept" && elicitResult.Content != null &&
               elicitResult.Content.ContainsKey(HeaderNames.Authorization)
            ? elicitResult.Content[HeaderNames.Authorization].GetString()
            : null;
    }
}