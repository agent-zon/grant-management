using Common.DTOs;

namespace GrantMcpLayer.Services;

public interface IGrantManagementClient
{
    Task<ToolPolicyDto?> GetToolPolicyAsync(string toolName, CancellationToken cancellationToken = default);
}

public class GrantManagementsClient(
    IHttpContextAccessor contextAccessor,
    HttpClient client) : IGrantManagementClient
{
    public async Task<ToolPolicyDto?> GetToolPolicyAsync(string toolName, CancellationToken cancellationToken = default)
    {
        var context = contextAccessor.HttpContext;
        if (context == null)
            throw new InvalidOperationException("No HTTP context available.");
        var agentId = context.ExtractAgentId();
        if (string.IsNullOrEmpty(agentId))
            throw new InvalidOperationException("Agent ID not found in context.");

        var response = await client.GetAsync($"/agents/{agentId}/tools/{toolName}", cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        
        response.EnsureSuccessStatusCode();
        var policy = await response.Content.ReadFromJsonAsync<ToolPolicyDto>(cancellationToken);
        return policy;
    }
}