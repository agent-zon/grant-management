using GrantMcpLayer.McpProxy.CleanHandlers;
using GrantMcpLayer.Models;
using GrantMcpLayer.Services;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy;

public static class WebApplicationBuilderExtensions
{
     public static IMcpServerBuilder AddMcpProxy(
         this WebApplicationBuilder applicationBuilder, 
         Action<McpProxyOptions>? setupAction = null)
    {
        var options = new McpProxyOptions();
        setupAction?.Invoke(options);
        
        applicationBuilder.Services.AddScoped<IMcpClientResolver, McpClientResolver>();
        applicationBuilder.Services.AddSingleton<IElicitationHandler, CleanElicitationHandlers>();

        applicationBuilder.Services.AddHttpClient();

        applicationBuilder.Services.AddSingleton<IMcpClientSessionsStorage, McpClientSessionsStorage>();
        applicationBuilder.Services.AddHostedService<ClearOldMcpClientsHostedService>();
        applicationBuilder.Services.AddSingleton<McpClientsCacheMiddleware>();
        
        var serverInfoSection = applicationBuilder.Configuration.GetSection("McpServerInfo");
        applicationBuilder.Services.Configure<McpServerInfo>(serverInfoSection);

        var mcpServerBuilder = applicationBuilder.Services
            .AddMcpServer(serverOptions =>
            {
                serverOptions.ScopeRequests = options.ScopeRequests;
                
                // Tools
                serverOptions.Capabilities ??= new();
                serverOptions.Capabilities.Tools = new ToolsCapability
                {
                    ListToolsHandler = (context, token) =>
                        options.ListToolsInterceptor?.Invoke(context, token, CleanToolsHandlers.ListToolsHandler) ??
                        CleanToolsHandlers.ListToolsHandler(context, token),
                    CallToolHandler = (context, token) =>
                        options.CallToolInterceptor?.Invoke(context, token, CleanToolsHandlers.CallToolHandler) ??
                        CleanToolsHandlers.CallToolHandler(context, token)
                };
                
                // Resources
                serverOptions.Capabilities.Resources = new()
                {
                    ListResourcesHandler = (context, token) =>
                        options.ListResourcesInterceptor?.Invoke(context, token,
                            CleanResourcesHandlers.ListResourcesHandler) ??
                        CleanResourcesHandlers.ListResourcesHandler(context, token),
                    ListResourceTemplatesHandler = (context, token) =>
                        options.ListResourceTemplatesInterceptor?.Invoke(context, token,
                            CleanResourcesHandlers.ListResourcesTemplateHandler) ??
                        CleanResourcesHandlers.ListResourcesTemplateHandler(context, token),
                    ReadResourceHandler = (context, token) =>
                        options.ReadResourceInterceptor?.Invoke(context, token,
                            CleanResourcesHandlers.ReadResourceHandler) ??
                        CleanResourcesHandlers.ReadResourceHandler(context, token)
                };
                
                // Completion
                serverOptions.Capabilities.Completions = new()
                {
                    CompleteHandler = (context, token) =>
                        options.CompleteInterceptor?.Invoke(context, token, CleanCompletionHandler.HandleCompletionAsync) ??
                        CleanCompletionHandler.HandleCompletionAsync(context, token)  
                };
                
                // Logger
                serverOptions.Capabilities.Logging = new()
                {
                    SetLoggingLevelHandler = (context, token) =>
                        options.SetLogLevelInterceptor?.Invoke(context, token, CleanLoggerHandler.HandleSetLogLevelAsync) ??
                        CleanLoggerHandler.HandleSetLogLevelAsync(context, token) 
                };

                serverOptions.Capabilities.NotificationHandlers = options.NotificationHandlers;
            })
            .WithHttpTransport();
        
        return options.AuthenticationType switch
        {
            McpProxyAuthenticationType.NoAuth => mcpServerBuilder.WithNoAuth(),
            McpProxyAuthenticationType.ForwardAuth => mcpServerBuilder.WithAuthForwarding(),
            McpProxyAuthenticationType.CustomAuth => mcpServerBuilder,
            _ => throw new ArgumentOutOfRangeException()
        };
    }
    
     public delegate ValueTask<TResult> ProxyInterceptorDelegate<TParams, TResult>(
         RequestContext<TParams> context, 
         CancellationToken token, 
         Func<RequestContext<TParams>, CancellationToken, ValueTask<TResult>> next);
     
    public class McpProxyOptions
    {
        public McpProxyAuthenticationType AuthenticationType { get; set; } = McpProxyAuthenticationType.NoAuth;
        public bool ScopeRequests { get; set; } = true;
        
        public ProxyInterceptorDelegate<ListToolsRequestParams, ListToolsResult>? ListToolsInterceptor { get; set; } 
        public ProxyInterceptorDelegate<CallToolRequestParams, CallToolResult>? CallToolInterceptor { get; set; }
        public ProxyInterceptorDelegate<ListResourcesRequestParams, ListResourcesResult>? ListResourcesInterceptor { get; set; }
        public ProxyInterceptorDelegate<ListResourceTemplatesRequestParams, ListResourceTemplatesResult>? ListResourceTemplatesInterceptor { get; set; }
        public ProxyInterceptorDelegate<ReadResourceRequestParams, ReadResourceResult>? ReadResourceInterceptor { get; set; }
        public ProxyInterceptorDelegate<CompleteRequestParams, CompleteResult>? CompleteInterceptor { get; set; }
        public ProxyInterceptorDelegate<SetLevelRequestParams, EmptyResult?>? SetLogLevelInterceptor { get; set; }

        public IEnumerable<KeyValuePair<string, Func<JsonRpcNotification, CancellationToken, ValueTask>>>? NotificationHandlers { get; set; } = null;
    }
}

public enum McpProxyAuthenticationType
{
    /// <summary>
    /// Will allow all requests to be proxied to the server.
    /// </summary>
    NoAuth = 0,
        
    /// <summary>
    /// Will forward the authentication process to the target server.
    /// </summary>
    ForwardAuth,
        
    /// <summary>
    /// Will do nothing in terms of registering the authentication handler.
    /// The invoker is responsible for providing the authentication handler by invoking
    /// AddAuthentication() & AddAuthorization() on the server builder.
    /// </summary>
    CustomAuth
}