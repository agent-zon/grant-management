using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Completion
{
    public static McpRequestFilter<CompleteRequestParams,CompleteResult> Complete(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<CompleteResult> (context, token) =>
            {
                //todo: merge results?
                var result = await next(context, token);
           
                var completionResult = await client.CompleteAsync(
                    context.Params.Ref,
                    context.Params.Argument.Name,
                    context.Params.Argument.Value,
                    cancellationToken: token);
                
                return completionResult;
            };
        }; 
    }
}