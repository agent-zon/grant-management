using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Client;

namespace GrantMcpLayer.McpProxy;

public static class Proxy
{
    private static readonly HashSet<string> HeadersToPassOn = new(StringComparer.OrdinalIgnoreCase)
    {
        "Authorization",
        "aiam-session-id",
        "mcp-session-id",
    };

    public static IMcpServerBuilder AddMcpProxy(
        this WebApplicationBuilder applicationBuilder)
    {
        var serverInfoSection = applicationBuilder.Configuration.GetSection("McpServerInfo");
        applicationBuilder.Services.Configure<McpServerInfo>(serverInfoSection);

        applicationBuilder.Services.AddHttpClient();

        var i = 0;
        var authority = applicationBuilder.Configuration.GetValue<string>("OIDC_AUTHORITY");
        Console.WriteLine("OIDC Authority: " + authority);

        var mcpServer = applicationBuilder.Services
            .AddMcpServer(serverOptions => { serverOptions.ScopeRequests = true; })
            .WithHttpTransport(options =>
            {
                options.PerSessionExecutionContext = true;

                options.ConfigureSessionOptions = async (httpContext, sessionOptions, cancellationToken) =>
                {
                    Console.WriteLine("{0}: Configuring session options...", i++);
                    var serverInfo = httpContext.RequestServices.GetRequiredService<IOptions<McpServerInfo>>().Value;

                    var mcpClient = await McpClient.CreateAsync(new HttpClientTransport(new()
                        {
                            Name = serverInfo.Name,
                            Endpoint = new Uri(serverInfo.Url),
                            AdditionalHeaders = TransformHeaders(httpContext),
                            // OAuth = ExternalAuth.OAuth(httpContext, server, cancellationToken)
                        }, httpContext.RequestServices.GetRequiredService<ILoggerFactory>()),
                        new (),
                        httpContext.RequestServices.GetRequiredService<ILoggerFactory>(), cancellationToken);
                    httpContext.Items[nameof(McpClient)] = mcpClient;
                    sessionOptions.Capabilities = mcpClient.ServerCapabilities;
                    Filters.All.RequestFilters(sessionOptions, mcpClient);
                };

                options.RunSessionHandler = async (httpContext, server, cancellationToken) =>
                {
                    Console.WriteLine("{0}: Running MCP Proxy session handler...", i++);
                    await using var mcpClient = httpContext.Items[nameof(McpClient)] as McpClient;

                    Filters.All.NotificationHandlers(mcpClient!, server);

                    await server.RunAsync(cancellationToken);
                };
 
                static IDictionary<string, string> TransformHeaders(HttpContext httpContext)
                {
                    var headers = httpContext.Request.Headers;
                    var mergedHeaders = new Dictionary<string, string>();
                    foreach (var existingHeaders in headers)
                    {
                        if (!HeadersToPassOn.Contains(existingHeaders.Key))
                            continue;

                        mergedHeaders.TryAdd(existingHeaders.Key, existingHeaders.Value.ToString());
                    }

                    return mergedHeaders;
                }
            });

        return authority is { Length: > 0 } ? mcpServer.WithAuthForwarding(authority) : mcpServer;
    }

    public static void UseMcpProxy(this WebApplication webApplication)
    {
        // webApplication.UseMiddleware<McpClientsCacheMiddleware>();

        webApplication.UseAuthentication();
        webApplication.UseAuthorization();

        webApplication.MapMcp()
            //.RequireAuthorization();
            ;
    }
}


//todo- category filtering per route
//var toolCategory = httpContext.Request.RouteValues["toolCategory"]?.ToString()?.ToLower() ?? "all";


//or use McpSession
/*    /// <summary>
/// Sends a JSON-RPC request to the connected session and waits for a response.
/// </summary>
/// <param name="request">The JSON-RPC request to send.</param>
/// <param name="cancellationToken">The <see cref="CancellationToken"/> to monitor for cancellation requests. The default is <see cref="CancellationToken.None"/>.</param>
/// <returns>A task containing the session's response.</returns>
/// <exception cref="InvalidOperationException">The transport is not connected, or another error occurs during request processing.</exception>
/// <exception cref="McpException">An error occurred during request processing.</exception>
/// <remarks>
/// This method provides low-level access to send raw JSON-RPC requests. For most use cases,
/// consider using the strongly-typed methods that provide a more convenient API.
/// </remarks>
public abstract Task<JsonRpcResponse> SendRequestAsync(JsonRpcRequest request, CancellationToken cancellationToken = default);

*/
 