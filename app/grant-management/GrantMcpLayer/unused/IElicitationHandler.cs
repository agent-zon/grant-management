using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.unused;

public interface IElicitationHandler
{
    ValueTask<ElicitResult> HandleElicitationAsync(
        McpServer? server,
        ElicitRequestParams? context,
        CancellationToken cancellationToken = default);
}

public class Elicitation : IElicitationHandler
{
    public ValueTask<ElicitResult> HandleElicitationAsync(McpServer? server, ElicitRequestParams? context,
        CancellationToken cancellationToken = default)
    {
        if (server != null && context != null)
            return server.ElicitAsync(context, cancellationToken);

        return ValueTask.FromResult(new ElicitResult() { Action = "cancel" });
    }
}