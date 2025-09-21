using System.Text.Json.Serialization;

namespace GrantManagementServer.Entities;

public class GrantEntity
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("client_id")]
    public string ClientId { get; set; } = "demo-client"; // placeholder until auth integrated
    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = null!;
    [JsonPropertyName("scope")]
    public string Scope { get; set; } = null!; // space separated scopes
    [JsonPropertyName("status")]
    public string Status { get; set; } = "active"; // active|revoked|expired
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("expires_at")]
    public DateTime? ExpiresAt { get; set; }
    [JsonPropertyName("session_id")]
    public string? SessionId { get; set; }
    [JsonPropertyName("workload_id")]
    public string? WorkloadId { get; set; }
    [JsonPropertyName("grant_data")]
    public string? GrantDataJson { get; set; }
}