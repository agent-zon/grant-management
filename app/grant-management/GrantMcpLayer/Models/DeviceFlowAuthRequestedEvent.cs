using Duende.IdentityModel.Client;

namespace GrantMcpLayer.Models;

public class DeviceFlowAuthRequestedEvent
{
    public required DeviceTokenRequest TokenRequest { get; set; }
    public required IHeaderDictionary HttpHeaders { get; set; }
    public required string ToolName { get; set; }
    public required DateTime Timestamp { get; set; }
    public required DateTime ConsentExpiration { get; set; }
}