using System.Linq;
using Common.DTOs;
using GrantManagementServer.Entities;

namespace GrantManagementServer.Mappers;

public static class CreateGrantRequestDtoExtensions
{
    public static GrantRequestEntity ToEntity(this CreateGrantRequestDto dto)
    {
        return new GrantRequestEntity
        {
            AgentId = dto.AgentId,
            SessionId = dto.SessionId,
            RequestedScopes = dto.RequestedScopes?.Distinct().ToList() ?? new List<string>(),
            Tools = dto.Tools?.Distinct().ToList() ?? new List<string>(),
            WorkloadId = dto.WorkloadId,
            Reason = dto.Reason
        };
    }

    public static CreateGrantRequestDto ToCreateGrantRequestDto(this GrantRequestEntity entity)
    {
        return new CreateGrantRequestDto(
            entity.AgentId,
            entity.SessionId,
            entity.RequestedScopes,
            entity.Tools,
            entity.WorkloadId,
            entity.Reason
        );
    }
}

