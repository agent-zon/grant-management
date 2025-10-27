using Common.DTOs;
using GrantManagementServer.Entities;

namespace GrantManagementServer.Mappers;

public static class ToolPolicyMapper
{
    public static ToolPolicyDto ToDto(this ToolPolicyEntity entity)
    {
        int? minutes = null;
        if (entity.ExplicitConsentPolicy.ConsentExpiration is { } ts)
        {
            minutes = (int)ts.TotalMinutes;
        }
        return new ToolPolicyDto(
            entity.AgentId,
            entity.ToolName,
            new ExplicitConsentPolicyDto(
                entity.ExplicitConsentPolicy.RequiresExplicitConsent,
                minutes
            )
        );
    }

    public static ToolPolicyEntity ToEntity(this ToolPolicyDto dto)
    {
        TimeSpan? ts = null;
        if (dto.ExplicitConsentPolicy.ConsentExpirationMinutes is int m)
        {
            ts = TimeSpan.FromMinutes(m);
        }
        var consent = new ExplicitConsentPolicy
        {
            RequiresExplicitConsent = dto.ExplicitConsentPolicy.RequiresExplicitConsent,
            ConsentExpiration = ts
        };
        return new ToolPolicyEntity
        {
            AgentId = dto.AgentId,
            ToolName = dto.ToolName,
            ExplicitConsentPolicy = consent
        };
    }
}