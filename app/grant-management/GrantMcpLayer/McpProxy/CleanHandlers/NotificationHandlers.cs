using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class NotificationHandlers
{ 
    public static void RegisterNotificationHandlers(McpClient client, McpServer server)
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

 