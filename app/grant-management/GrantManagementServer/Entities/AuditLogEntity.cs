using System.Text.Json.Serialization;

namespace GrantManagementServer.Entities;

public class AuditLogEntity
{
    [JsonPropertyName("id")] 
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    
    [JsonPropertyName("grant_id")]
    public string? GrantId { get; set; }
    
    [JsonPropertyName("action")]
    public string Action { get; set; } = null!; // grant_created, grant_revoked, grant_request_created, grant_request_decision
    
    [JsonPropertyName("actor")]
    public string Actor { get; set; } = "system";
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [JsonPropertyName("details")]
    public string? DetailsJson { get; set; }
}