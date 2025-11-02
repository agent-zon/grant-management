using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.unused.Tap;

public class Prompt(McpClientPrompt clientPrompt) : McpServerPrompt
{
    public static McpServerPrimitiveCollection<McpServerPrompt> CreateCollection(IReadOnlyList<McpClientPrompt> clientPrompts)
    {
        var serverPrompts = new McpServerPrimitiveCollection<McpServerPrompt>();
        foreach (var clientPrompt in clientPrompts)
        {
            serverPrompts.Add(new Prompt(clientPrompt));
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
    public override ModelContextProtocol.Protocol.Prompt ProtocolPrompt  => prompt.ProtocolPrompt;

    /// <inheritdoc />
    public override IReadOnlyList<object> Metadata => prompt.Metadata;
}