using System.Collections.ObjectModel;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.unused.Tap;

public class Tool(McpClientTool tool) : McpServerTool
{
    public static McpServerPrimitiveCollection<McpServerTool> FromClientTools(IList<McpClientTool> clientTools)
    {
        Console.WriteLine($"Tapping {clientTools.Count} client tools into server tools.");
        var serverTools = new McpServerPrimitiveCollection<McpServerTool>();
        foreach (var clientTool in clientTools)
        {
            serverTools.Add(new Tool(clientTool));
        }
        return serverTools;
    }
    
    public override ModelContextProtocol.Protocol.Tool ProtocolTool => tool.ProtocolTool;

    public override IReadOnlyList<object> Metadata => [];
    public override async ValueTask<CallToolResult> InvokeAsync(RequestContext<CallToolRequestParams> context, CancellationToken token= default)
    {
        Console.WriteLine($"McpServerTapTool:InvokeAsync   tool: {context.Params?.Name} , IsCancellationRequested: {token.IsCancellationRequested}");
        
        return await tool.CallAsync(arguments: new ReadOnlyDictionary<string, object?>(context.Params?.Arguments?.ToDictionary(kvp => kvp.Key, kvp => (object?)kvp.Value ) ?? []), cancellationToken:  token);
    }
}