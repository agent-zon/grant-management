using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.unused.Tap;

public class Resource(McpClientResource clientResource) : McpServerResource
{
    public static McpServerPrimitiveCollection<McpServerResource> CreateCollection(IList<McpClientResource> clientResources)
    {
        var serverResources = new McpServerPrimitiveCollection<McpServerResource>();
        foreach (var clientResource in clientResources)
        {
            serverResources.Add(new Resource(clientResource));
        }

        return serverResources;
    }
    
    private McpServerResource resource =>clientResource.ProtocolResource?.McpServerResource ?? throw new InvalidOperationException("The provided McpClientResource does not have a corresponding McpServerResource implementation.");

 

    /// <inheritdoc />
    public override bool IsMatch(string uri)
    {
        return resource.IsMatch(uri);
    }

    /// <inheritdoc />
    public override ValueTask<ReadResourceResult> ReadAsync(RequestContext<ReadResourceRequestParams> request, CancellationToken cancellationToken = new CancellationToken())
    {
        return  resource.ReadAsync(request, cancellationToken);
    }

    /// <inheritdoc />
    public override ResourceTemplate ProtocolResourceTemplate => resource.ProtocolResourceTemplate;

    /// <inheritdoc />
    public override IReadOnlyList<object> Metadata => resource.Metadata;
}