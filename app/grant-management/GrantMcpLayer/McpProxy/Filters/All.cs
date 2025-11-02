using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class All
{
    public static void RequestFilters(McpServerOptions serverOptions,  McpClient mcpClient)
    { 
        serverOptions.Filters.ListToolsFilters.Add(Tools.List(mcpClient));
        serverOptions.Filters.CallToolFilters.Add(Tools.Call(mcpClient));
        serverOptions.Filters.ListResourcesFilters.Add(Resources.List(mcpClient));
        serverOptions.Filters.ListResourceTemplatesFilters.Add(Resources.ListTemplates(mcpClient));
        serverOptions.Filters.ReadResourceFilters.Add(Resources.Read(mcpClient));
        serverOptions.Filters.CompleteFilters.Add(Completion.Complete(mcpClient));
        serverOptions.Filters.SetLoggingLevelFilters.Add(Logger.SetLevel(mcpClient));

    }
    
    public static void NotificationHandlers(McpClient client, McpServer server)
    {
        //todo: register all notification handlers, use same mcp client form configure session options
        client.RegisterNotificationHandler(NotificationMethods.CancelledNotification,
            async (notification, token) =>
            {
                await server.SendNotificationAsync(notification.Method, notification.Params,
                    cancellationToken: token);
            });
        
    }
}