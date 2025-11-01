using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public class CleanElicitationHandlers : IElicitationHandler
{
        public ValueTask<ElicitResult> HandleElicitationAsync(McpServer? server, ElicitRequestParams? context,
            CancellationToken cancellationToken = default)
        {
            if (server != null && context != null)
                return server.ElicitAsync(context, cancellationToken);

            return ValueTask.FromResult(new ElicitResult() { Action = "cancel" });
        }
        
        
        
        public McpRequestFilter<ElicitRequestParams,ElicitResult> RequestFilter(McpServer server)
        {
            return (next) =>
            {
                return async ValueTask<ElicitResult> (context, token) =>
                {
                    //todo:should we use next here?
                    // var result = await next(context, token);
                     return await server.ElicitAsync(
                        context.Params,
                        cancellationToken: token);
                };
            }; 
        }
}