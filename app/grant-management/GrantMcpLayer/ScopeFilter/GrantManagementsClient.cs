using Common.DTOs;

namespace GrantMcpLayer.Services;

public interface IGrantManagementClient
{
    Task<ToolPolicyDto?> GetToolPolicyAsync(string agent,string toolName, CancellationToken cancellationToken = default);
}

public class GrantManagementsClient(
    HttpClient client) : IGrantManagementClient
{
    public async Task<ToolPolicyDto?> GetToolPolicyAsync(string agent, string toolName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(agent))
            throw new InvalidOperationException("Agent ID not found in context.");

        var response = await client.GetAsync($"/agents/{agent}/tools/{toolName}", cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        
        response.EnsureSuccessStatusCode();
        var policy = await response.Content.ReadFromJsonAsync<ToolPolicyDto>(cancellationToken);
        return policy;
    }
}