using System.Collections.ObjectModel;
using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanToolsHandlers
{
    public static McpRequestFilter<ListToolsRequestParams,ListToolsResult> ListToolsHandler(McpClient client)
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

    public static McpRequestFilter<ListToolsRequestParams, ListToolsResult> List = (next) =>
    {
        return async ValueTask<ListToolsResult> (context, token) =>
        {
            var client = context.Items.TryGetValue(nameof(McpClient), out var mcp) ? mcp as McpClient:
                           throw new InvalidOperationException("McpClient not found in context items.");
            var result = await next(context, token);
            var tools = await client!.ListToolsAsync(cancellationToken: token);
            foreach (var tool in tools.Select(t => t.ProtocolTool))
            {
                result.Tools.Add(tool);
            }

            return result;
        };
    };

    public static McpRequestFilter<CallToolRequestParams,CallToolResult> CallToolHandler(McpClient client)
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



 
public class McpServerTapTool(McpClientTool tool) : McpServerTool
{
    public static McpServerPrimitiveCollection<McpServerTool> FromClientTools(IList<McpClientTool> clientTools)
    {
        Console.WriteLine($"Tapping {clientTools.Count} client tools into server tools.");
        var serverTools = new McpServerPrimitiveCollection<McpServerTool>();
        foreach (var clientTool in clientTools)
        {
            serverTools.Add(new McpServerTapTool(clientTool));
        }
        return serverTools;
    }
    
    public override Tool ProtocolTool => tool.ProtocolTool;

    public override IReadOnlyList<object> Metadata => [];
    public override async ValueTask<CallToolResult> InvokeAsync(RequestContext<CallToolRequestParams> context, CancellationToken token= default)
    {
        Console.WriteLine($"McpServerTapTool:InvokeAsync   tool: {context.Params?.Name} , IsCancellationRequested: {token.IsCancellationRequested}");
        
        return await tool.CallAsync(arguments: new ReadOnlyDictionary<string, object?>(context.Params?.Arguments?.ToDictionary(kvp => kvp.Key, kvp => (object?)kvp.Value ) ?? []), cancellationToken:  token);
    }
}
