using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Tools
{
    public static McpRequestFilter<ListToolsRequestParams,ListToolsResult> List(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<ListToolsResult> (context, token) =>
            {
                var result = await next(context, token);
                var tools = await client.ListToolsAsync(cancellationToken: token);
                foreach (var tool in tools.Select(t => t.ProtocolTool))
                {
                    result.Tools.Add(tool);
                }
                return result;
            };
        }; 
    }

    

    public static McpRequestFilter<CallToolRequestParams,CallToolResult> Call(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<CallToolResult> (context, token) =>
            {
                Console.WriteLine($"Proxying CallTool request for tool: {context.Params?.Name} , IsCancellationRequested: {token.IsCancellationRequested}");
                var toolResult = await client.CallToolAsync(
                    context.Params!.Name,
                    context.Params.Arguments?.ToDictionary(kvp => kvp.Key,
                        kvp => (object?)kvp.Value),
                    progress: new Progress<ProgressNotificationValue>( pn =>
                    {
                        Console.WriteLine($"Progress from tool {context.Params?.Name}: {pn.Message} ({pn.Progress}%)");
                        if (context.Params?.ProgressToken is  not null)
                        {
                            context.Server.SendNotificationAsync(NotificationMethods.ProgressNotification,
                                parameters: new ProgressNotificationParams
                                {
                                    ProgressToken = context.Params.ProgressToken.Value,

                                    Progress = pn
                                }, cancellationToken: token);
                        }
                    }),
                    cancellationToken: token);
                return toolResult;
            };
        }; 
    }
 
    
    
    
}