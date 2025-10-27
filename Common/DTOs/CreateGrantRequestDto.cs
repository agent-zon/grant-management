using System.Text.Json.Serialization;

namespace Common.DTOs;

public record CreateGrantRequestDto(
    [property: JsonPropertyName("agent_id")] string AgentId,
    [property: JsonPropertyName("session_id")] string SessionId,
    [property: JsonPropertyName("requested_scopes")] IEnumerable<string> RequestedScopes,
    [property: JsonPropertyName("tools")] IEnumerable<string> Tools,
    [property: JsonPropertyName("workload_id")] string? WorkloadId,
    [property: JsonPropertyName("reason")] string? Reason);