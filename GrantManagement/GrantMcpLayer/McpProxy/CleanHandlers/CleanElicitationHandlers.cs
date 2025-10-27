using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public class CleanElicitationHandlers : IElicitationHandler
{
        public ValueTask<ElicitResult> HandleElicitationAsync(IMcpServer? server, ElicitRequestParams? context,
            CancellationToken cancellationToken = default)
        {
            if (server != null && context != null)
                return server.ElicitAsync(context, cancellationToken);

            return ValueTask.FromResult(new ElicitResult() { Action = "cancel" });
        }
}