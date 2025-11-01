using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanResourcesHandlers
{
    public static McpRequestFilter<ListResourcesRequestParams,ListResourcesResult> ListResourcesHandler(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<ListResourcesResult> (context, token) =>
            {
                var result = await next(context, token);
                var resources = await client.ListResourcesAsync(cancellationToken: token);
                foreach (var resource in resources.Select(t => t.ProtocolResource))
                {
                    result.Resources.Add(resource);
                }
                return result;
            };
        }; 
    }
    
    public static McpRequestFilter<ListResourceTemplatesRequestParams,ListResourceTemplatesResult> ListResourcesTemplateHandler(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<ListResourceTemplatesResult> (context, token) =>
            {
                var result = await next(context, token);
                var resources = await client.ListResourceTemplatesAsync(cancellationToken: token);
                foreach (var resource in resources.Select(t => t.ProtocolResourceTemplate))
                {
                    result.ResourceTemplates.Add(resource);
                }
                return result;
            };
        }; 
    }
    
    public static McpRequestFilter<ReadResourceRequestParams,ReadResourceResult> ReadResourceHandler(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<ReadResourceResult> (context, token) =>
            {
                var resourceResult = await client.ReadResourceAsync(
                    context.Params.Uri,
                    cancellationToken: token);
                return resourceResult;
            };
        }; 
    }
}


public class McpServerResourceTap(McpClientResource clientResource) : McpServerResource
{
    public static McpServerPrimitiveCollection<McpServerResource> CreateCollection(IList<McpClientResource> clientResources)
    {
        var serverResources = new McpServerPrimitiveCollection<McpServerResource>();
        foreach (var clientResource in clientResources)
        {
            serverResources.Add(new McpServerResourceTap(clientResource));
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
