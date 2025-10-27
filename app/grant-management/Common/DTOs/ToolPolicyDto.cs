using System;
using System.Text.Json.Serialization;
using Common.Models;

namespace Common.DTOs;

public record ExplicitConsentPolicyDto(
    [property: JsonPropertyName("toolName")] string ToolName,
    [property: JsonPropertyName("requiresExplicitConsent")] bool RequiresExplicitConsent,
    [property: JsonPropertyName("consentExpirationMinutes")] int? ConsentExpirationMinutes,
    [property: JsonPropertyName("consentExpiration")] string? ConsentExpiration
);

public record ToolPolicyDto(
    [property: JsonPropertyName("agentId")] string AgentId,
    [property: JsonPropertyName("toolName")] string ToolName,
    [property: JsonPropertyName("explicitConsentPolicy")] ExplicitConsentPolicyDto ExplicitConsentPolicy)
{
    public static ToolPolicyDto FromEntity(ToolPolicy entity)
    {
        int? minutes = null;
        string? legacy = null;
        if (entity.ExplicitConsentPolicy.ConsentExpiration is { } ts)
        {
            minutes = (int)ts.TotalMinutes;
            legacy = ts.ToString();
        }
        return new ToolPolicyDto(
            entity.AgentId,
            entity.ToolName,
            new ExplicitConsentPolicyDto(
                entity.ToolName,
                entity.ExplicitConsentPolicy.RequiresExplicitConsent,
                minutes,
                legacy
            )
        );
    }

    public ToolPolicy ToEntity()
    {
        TimeSpan? ts = null;
        if (ExplicitConsentPolicy.ConsentExpirationMinutes is int m)
        {
            ts = TimeSpan.FromMinutes(m);
        }
        else if (!string.IsNullOrWhiteSpace(ExplicitConsentPolicy.ConsentExpiration) &&
                 TimeSpan.TryParse(ExplicitConsentPolicy.ConsentExpiration, out var parsed))
        {
            ts = parsed;
        }
        var consent = new ExplicitConsentPolicy
        {
            ToolName = ToolName,
            RequiresExplicitConsent = ExplicitConsentPolicy.RequiresExplicitConsent,
            ConsentExpiration = ts
        };
        return new ToolPolicy
        {
            AgentId = AgentId,
            ToolName = ToolName,
            ExplicitConsentPolicy = consent
        };
    }
}

