using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Notifications
{ 
    public static void Register(McpClient client, McpServer server)
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

 