using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanLoggerHandler
{
    public static McpRequestFilter<SetLevelRequestParams, EmptyResult> SetLogLevelHandler(McpClient mcpClient)
    {
        return (next) =>
        {
            return async ValueTask<EmptyResult> (context, token) =>
            {
                await next(context, token);
                await mcpClient.SetLoggingLevel(
                    context.Params.Level,
                    cancellationToken: token);
                return new EmptyResult();
            };
        };
    }
}