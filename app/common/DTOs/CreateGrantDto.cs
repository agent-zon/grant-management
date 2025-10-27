using System.Text.Json.Serialization;

namespace Common.DTOs;

public record CreateGrantDto(
    [property: JsonPropertyName("user_id")] string UserId, 
    [property: JsonPropertyName("scope")] string Scope,
    [property: JsonPropertyName("session_id")] string? SessionId,
    [property: JsonPropertyName("workload_id")] string? WorkloadId,
    [property: JsonPropertyName("expires_at")] DateTime? ExpiresAt,
    [property: JsonPropertyName("grant_data")] object? GrantData);
