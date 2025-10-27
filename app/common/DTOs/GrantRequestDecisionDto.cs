using System.Text.Json.Serialization;

namespace Common.DTOs;

public record GrantRequestDecisionDto(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("approved_scopes")] IEnumerable<string>? ApprovedScopes,
    [property: JsonPropertyName("denied_scopes")] IEnumerable<string>? DeniedScopes);