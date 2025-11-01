using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Collections.ObjectModel;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Channels;
using System.Web;
using GrantMcpLayer.McpProxy.Auth;
using GrantMcpLayer.McpProxy.CleanHandlers;
using GrantMcpLayer.Models;
using GrantMcpLayer.Services;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using ModelContextProtocol;
using ModelContextProtocol.Authentication;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using MpcProxy.Common;
using ModelContextProtocol.AspNetCore.Authentication;
using static GrantMcpLayer.Interceptors.CallToolInterceptor;
using static GrantMcpLayer.McpProxy.CleanHandlers.CleanCompletionHandler;
using static GrantMcpLayer.McpProxy.CleanHandlers.CleanLoggerHandler;
using static GrantMcpLayer.McpProxy.CleanHandlers.CleanResourcesHandlers;
using static GrantMcpLayer.McpProxy.CleanHandlers.CleanToolsHandlers;

namespace GrantMcpLayer.McpProxy;


public static class WebApplicationBuilderExtensions
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


        // applicationBuilder.Services.AddSingleton<IElicitationHandler, CleanElicitationHandlers>();

        applicationBuilder.Services.AddHttpClient();

        // applicationBuilder.Services.AddSingleton<IMcpClientSessionsStorage, McpClientSessionsStorage>();
        // applicationBuilder.Services.AddHostedService<ClearOldMcpClientsHostedService>();
        // applicationBuilder.Services.AddSingleton<McpClientsCacheMiddleware>();

        var i = 0;
        var authority = applicationBuilder.Configuration.GetValue<string>("OIDC_AUTHORITY");
        Console.WriteLine("OIDC Authority: " + authority);

        var mcpServer = applicationBuilder.Services
            .AddMcpServer(serverOptions => { serverOptions.ScopeRequests = true; })
            .WithHttpTransport(options =>
            {
                options.PerSessionExecutionContext = true;
                options.RunSessionHandler = async (httpContext, server, cancellationToken) =>
                {
                    Console.WriteLine("{0}: Running MCP Proxy session handler...", i++);
                    await using var mcpClient = httpContext.Items[nameof(McpClient)] as McpClient;
                    
                    NotificationHandlers.RegisterNotificationHandlers(mcpClient!, server);

                    await server.RunAsync(cancellationToken);
 
                };

                options.ConfigureSessionOptions = async (httpContext, sessionOptions, cancellationToken) =>
                {
                    Console.WriteLine("{0}: Configuring session options...", i++);
                    var serverInfo = httpContext.RequestServices.GetRequiredService<IOptions<McpServerInfo>>().Value;
 
                   var mcpClient = await McpClient.CreateAsync(new HttpClientTransport(new()
                        {
                            Name = serverInfo.Name,
                            Endpoint = new Uri(serverInfo.Url),
                            AdditionalHeaders = getHeaders(),
                            // OAuth = ExternalAuth.OAuth(httpContext, server, cancellationToken)
                        }, httpContext.RequestServices.GetRequiredService<ILoggerFactory>()),
                        new McpClientOptions()
                        {
                            ClientInfo = sessionOptions.KnownClientInfo  
                        },
                        httpContext.RequestServices.GetRequiredService<ILoggerFactory>(), cancellationToken);

                    sessionOptions.Capabilities = mcpClient.ServerCapabilities;
                    sessionOptions.Filters.ListToolsFilters.Add(ListToolsHandler(mcpClient));
                    sessionOptions.Filters.CallToolFilters.Add(CallToolHandler(mcpClient));
                    sessionOptions.Filters.ListResourcesFilters.Add(ListResourcesHandler(mcpClient));
                    sessionOptions.Filters.ListResourceTemplatesFilters.Add(ListResourcesTemplateHandler(mcpClient));
                    sessionOptions.Filters.ReadResourceFilters.Add(ReadResourceHandler(mcpClient));
                    sessionOptions.Filters.CompleteFilters.Add(CompletionHandler(mcpClient));
                    sessionOptions.Filters.SetLoggingLevelFilters.Add(SetLogLevelHandler(mcpClient));
                    httpContext.Items[nameof(McpClient)] = mcpClient;


                    IDictionary<string, string> getHeaders()
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
                };

            });

        return authority is { Length: > 0 } ? mcpServer.WithAuthForwarding(authority) : mcpServer;
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

/// Handles the OAuth authorization URL by starting a local HTTP server and opening a browser.
/// This implementation demonstrates how SDK consumers can provide their own authorization flow.
/// </summary>
/// <param name="authorizationUrl">The authorization URL to open in the browser.</param>
/// <param name="redirectUri">The redirect URI where the authorization code will be sent.</param>
/// <param name="cancellationToken">The cancellation token.</param>
/// <returns>The authorization code extracted from the callback, or null if the operation failed.</returns>