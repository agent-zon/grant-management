using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Logger
{
    public static McpRequestFilter<SetLevelRequestParams, EmptyResult> SetLevel(McpClient mcpClient)
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