using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanCompletionHandler
{
    public static async ValueTask<CompleteResult> HandleCompletionAsync(
        RequestContext<CompleteRequestParams> context,
        CancellationToken token)
    {
        var result = new CompleteResult();
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var mcpClient = await clientResolver.ResolveAsync(context.Server, ct: token);
 
            result = await mcpClient.CompleteAsync(
                context.Params.Ref,
                context.Params.Argument.Name,
                context.Params.Argument.Value,
                cancellationToken: token);
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
        }

        return result;
    }
}