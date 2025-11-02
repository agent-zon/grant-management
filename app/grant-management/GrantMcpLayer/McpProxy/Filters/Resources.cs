using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Resources
{
    public static McpRequestFilter<ListResourcesRequestParams,ListResourcesResult> List(McpClient client)
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
    
    public static McpRequestFilter<ListResourceTemplatesRequestParams,ListResourceTemplatesResult> ListTemplates(McpClient client)
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
    
    public static McpRequestFilter<ReadResourceRequestParams,ReadResourceResult> Read(McpClient client)
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