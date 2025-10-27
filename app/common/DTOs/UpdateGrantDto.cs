using System.Text.Json.Serialization;

namespace Common.DTOs;

public record UpdateGrantDto(
    [property: JsonPropertyName("scope")] string? Scope,
    [property: JsonPropertyName("grant_data")] object? GrantData);
