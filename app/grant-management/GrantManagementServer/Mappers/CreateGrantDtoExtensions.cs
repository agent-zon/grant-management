using System.Text.Json;
using Common.DTOs;
using GrantManagementServer.Entities;

namespace GrantManagementServer.Mappers;

public static class CreateGrantDtoExtensions
{
    public static GrantEntity ToEntity(this CreateGrantDto dto, JsonSerializerOptions? serializerOptions = null)
    {
        return new GrantEntity
        {
            UserId = dto.UserId,
            Scope = dto.Scope,
            SessionId = dto.SessionId,
            WorkloadId = dto.WorkloadId,
            ExpiresAt = dto.ExpiresAt,
            GrantDataJson = SerializeGrantData(dto.GrantData)
        };
    }

    public static CreateGrantDto ToCreateGrantDto(this GrantEntity entity, JsonSerializerOptions? serializerOptions = null)
    {
        return new CreateGrantDto(
            entity.UserId,
            entity.Scope,
            entity.SessionId,
            entity.WorkloadId,
            entity.ExpiresAt,
            DeserializeGrantData(entity.GrantDataJson)
        );
    }

    private static string? SerializeGrantData(object? data, JsonSerializerOptions? serializerOptions = null)
    {
        if (data is null) return null;
        if (data is string s) return s; // already a json string or raw string
        return JsonSerializer.Serialize(data, serializerOptions);
    }

    private static object? DeserializeGrantData(string? json, JsonSerializerOptions? serializerOptions = null)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<object>(json, serializerOptions);
        }
        catch
        {
            // fallback: return raw json string if deserialization fails
            return json;
        }
    }
}

