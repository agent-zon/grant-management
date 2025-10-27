using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public interface IElicitationHandler
{
    ValueTask<ElicitResult> HandleElicitationAsync(
        IMcpServer? server,
        ElicitRequestParams? context,
        CancellationToken cancellationToken = default);
}