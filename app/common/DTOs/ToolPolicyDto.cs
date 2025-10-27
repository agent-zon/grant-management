using System.Text.Json.Serialization;

namespace Common.DTOs;

public record ExplicitConsentPolicyDto(
    [property: JsonPropertyName("requiresExplicitConsent")] bool RequiresExplicitConsent,
    [property: JsonPropertyName("consentExpirationMinutes")] int? ConsentExpirationMinutes
);

public record ToolPolicyDto(
    [property: JsonPropertyName("agentId")] string AgentId,
    [property: JsonPropertyName("toolName")] string ToolName,
    [property: JsonPropertyName("explicitConsentPolicy")] ExplicitConsentPolicyDto ExplicitConsentPolicy);