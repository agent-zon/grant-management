using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanToolsHandlers
{
    public static async ValueTask<ListToolsResult> ListToolsHandler(RequestContext<ListToolsRequestParams> context,
        CancellationToken token)
    {
        var result = new ListToolsResult();
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var client = await clientResolver.ResolveAsync(context.Server, ct: token);

            var tools = await client.ListToolsAsync(cancellationToken: token);
            result.Tools = tools.Select(t => t.ProtocolTool).ToList();
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }

        return result;
    }

    public static async ValueTask<CallToolResult> CallToolHandler(RequestContext<CallToolRequestParams> context,
        CancellationToken token)
    {
        var clientResolver = context.Services.GetMcpClientResolver();
        var client = await clientResolver.ResolveAsync(context.Server, ct: token);

        return await client.CallToolAsync(
            context.Params.Name,
            context.Params.Arguments?.ToDictionary(kvp => kvp.Key,
                kvp => (object?)kvp.Value),
            cancellationToken: token);
    }
}