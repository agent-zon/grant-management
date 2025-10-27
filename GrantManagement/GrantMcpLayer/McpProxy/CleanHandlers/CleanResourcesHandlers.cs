using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class CleanResourcesHandlers
{
    public static async ValueTask<ListResourcesResult> ListResourcesHandler(
        RequestContext<ListResourcesRequestParams> context,
        CancellationToken token)
    {
        IList<McpClientResource> resources = [];
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var client = await clientResolver.ResolveAsync(context.Server, ct: token);
            resources = await client.ListResourcesAsync(cancellationToken: token);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }

        return new() { Resources = resources.Select(r => r.ProtocolResource).ToList() };
    }

    public static async ValueTask<ListResourceTemplatesResult> ListResourcesTemplateHandler(
        RequestContext<ListResourceTemplatesRequestParams> context,
        CancellationToken token)
    {
        IList<McpClientResourceTemplate> resources = [];
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var client = await clientResolver.ResolveAsync(context.Server, ct: token);

            resources = await client.ListResourceTemplatesAsync(cancellationToken: token);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }

        return new() { ResourceTemplates = resources.Select(r => r.ProtocolResourceTemplate).ToList() };
    }

    public static async ValueTask<ReadResourceResult> ReadResourceHandler(
        RequestContext<ReadResourceRequestParams> context,
        CancellationToken token)
    {
        var clientResolver = context.Services.GetMcpClientResolver();
        var client = await clientResolver.ResolveAsync(context.Server, ct: token);

        return await client.ReadResourceAsync(context.Params.Uri, cancellationToken: token);
    }
}