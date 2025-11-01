using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.CleanHandlers;

public static class PromptsHandler
{ 
    public static McpRequestFilter<ListPromptsRequestParams,ListPromptsResult> ListPromptsHandler(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<ListPromptsResult> (context, token) =>
            {
                var result = await next(context, token);
                var prompts = await client.ListPromptsAsync(cancellationToken: token);
                foreach (var prompt in prompts.Select(t => t.ProtocolPrompt))
                {
                    result.Prompts.Add(prompt);
                }
                return result;
            };
        }; 
    }
    
    public static McpRequestFilter<GetPromptRequestParams,GetPromptResult> GetPromptHandler(McpClient client)
    {
        return (next) =>
        {
            return async ValueTask<GetPromptResult> (context, token) =>
            {
                var promptResult = await client.GetPromptAsync(
                    context.Params!.Name,
                    context.Params.Arguments?.ToDictionary(kvp => kvp.Key,
                        kvp => (object?)kvp.Value),
                    cancellationToken: token);
                return promptResult;
            };
        }; 
    } 
}

public class McpServerPromptTap(McpClientPrompt clientPrompt) : McpServerPrompt
{
    public static McpServerPrimitiveCollection<McpServerPrompt> CreateCollection(IReadOnlyList<McpClientPrompt> clientPrompts)
    {
        var serverPrompts = new McpServerPrimitiveCollection<McpServerPrompt>();
        foreach (var clientPrompt in clientPrompts)
        {
            serverPrompts.Add(new McpServerPromptTap(clientPrompt));
        }
        return serverPrompts;
    }
    
    private McpServerPrompt prompt =>clientPrompt.ProtocolPrompt?.McpServerPrompt ?? throw new InvalidOperationException("The provided McpClientPrompt does not have a corresponding McpServerPrompt implementation.");


    /// <inheritdoc />
    public override ValueTask<GetPromptResult> GetAsync(RequestContext<GetPromptRequestParams> request, CancellationToken cancellationToken = new CancellationToken())
    {
        return prompt.GetAsync(request, cancellationToken);
    }

    /// <inheritdoc />
    public override Prompt ProtocolPrompt  => prompt.ProtocolPrompt;

    /// <inheritdoc />
    public override IReadOnlyList<object> Metadata => prompt.Metadata;
}
