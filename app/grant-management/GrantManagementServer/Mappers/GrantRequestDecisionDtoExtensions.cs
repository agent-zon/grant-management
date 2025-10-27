using Common.DTOs;
using GrantManagementServer.Entities;

namespace GrantManagementServer.Mappers;

public static class GrantRequestDecisionDtoExtensions
{
    public static GrantRequestDecisionDto ToDecisionDto(this GrantRequestEntity entity)
    {
        return new GrantRequestDecisionDto(
            entity.Status.ToString().ToLowerInvariant(),
            entity.ApprovedScopes,
            entity.DeniedScopes
        );
    }

    public static GrantRequestEntity ApplyDecision(this GrantRequestDecisionDto dto, GrantRequestEntity entity)
    {
        if (dto is null) return entity;
        var status = dto.Status?.Trim().ToLowerInvariant();
        switch (status)
        {
            case "approved":
                entity.Approve(dto.ApprovedScopes, dto.DeniedScopes);
                break;
            case "denied":
                entity.Deny(dto.DeniedScopes);
                break;
            case "expired":
                entity.Expire();
                break;
            case "pending":
                // no action; keep existing state
                break;
            default:
                // Unknown status string - ignore (could throw if stricter behavior desired)
                break;
        }
        return entity;
    }
}

