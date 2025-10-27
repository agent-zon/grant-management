using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class PromptsHandler
{
    public static async ValueTask<ListPromptsResult> ListPromptsHandler(
        RequestContext<ListPromptsRequestParams> context,
        CancellationToken token)
    {
        IList<McpClientPrompt> prompts = [];
        try
        {
            var clientResolver = context.Services.GetMcpClientResolver();
            var client = await clientResolver.ResolveAsync(context.Server, ct: token);

            prompts = await client.ListPromptsAsync(cancellationToken: token);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }

        return new() { Prompts = prompts.Select(r => r.ProtocolPrompt).ToList() };
    }

    public static async ValueTask<GetPromptResult> GetPromptHandler(
        RequestContext<GetPromptRequestParams> context,
        CancellationToken token)
    {
        var clientResolver = context.Services.GetMcpClientResolver();
        var client = await clientResolver.ResolveAsync(context.Server, ct: token);

        return await client.GetPromptAsync(
            context.Params.Name,
            context.Params.Arguments?.ToDictionary(kvp => kvp.Key,
                kvp => (object?)kvp.Value),
            cancellationToken: token);
    }
}