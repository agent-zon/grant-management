using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanLoggerHandler
{
    public static async ValueTask<EmptyResult> HandleSetLogLevelAsync(
        RequestContext<SetLevelRequestParams> context,
        CancellationToken token)
    {
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var mcpClient = await clientResolver.ResolveAsync(context.Server, ct: token);

            await mcpClient.SetLoggingLevel(
                context.Params.Level,
                cancellationToken: token);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }

        return new EmptyResult();
    }
}