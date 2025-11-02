using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public class Elicitation 
{ 
        public McpRequestFilter<ElicitRequestParams,ElicitResult> Elicit(McpServer server)
        {
            return (next) =>
            {
                return async ValueTask<ElicitResult> (context, token) =>
                {
                     return await server.ElicitAsync(
                        context.Params!,
                        cancellationToken: token);
                };
            }; 
        }
}