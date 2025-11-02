using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.McpProxy.Filters;

public static class Prompts
{ 
    public static McpRequestFilter<ListPromptsRequestParams,ListPromptsResult> List(McpClient client)
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
    
    public static McpRequestFilter<GetPromptRequestParams,GetPromptResult> Get(McpClient client)
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