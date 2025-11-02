using Duende.IdentityModel.Client;

namespace GrantMcpLayer.Models;

public class DeviceFlowAuthRequestedEvent
{
    public required DeviceTokenRequest TokenRequest { get; set; }
     public required string ToolName { get; set; }
    public required DateTime Timestamp { get; set; }
    public required DateTime ConsentExpiration { get; set; }
    public string Agent { get; set; }
    public string? User { get; set; }
    public string? Grant { get; set; }
    public string Tool { get; set; }
}