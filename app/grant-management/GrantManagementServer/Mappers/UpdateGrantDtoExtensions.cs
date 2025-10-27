using System.Text.Json;
using Common.DTOs;
using GrantManagementServer.Entities;

namespace GrantManagementServer.Mappers;

public static class UpdateGrantDtoExtensions
{
    public static GrantEntity ApplyUpdate(this UpdateGrantDto dto, GrantEntity existing)
    {
        // Create a copy (or could mutate existing). Here we mutate existing to keep identity fields.
        if (dto.Scope is not null)
        {
            existing.Scope = dto.Scope;
        }
        if (dto.GrantData is not null)
        {
            existing.GrantDataJson = SerializeGrantData(dto.GrantData);
        }
        existing.UpdatedAt = DateTime.UtcNow;
        return existing;
    }

    public static UpdateGrantDto ToUpdateGrantDto(this GrantEntity entity)
    {
        return new UpdateGrantDto(
            entity.Scope,
            DeserializeGrantData(entity.GrantDataJson)
        );
    }

    private static string? SerializeGrantData(object? data)
    {
        if (data is null) return null;
        if (data is string s) return s;
        return JsonSerializer.Serialize(data);
    }

    private static object? DeserializeGrantData(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<object>(json);
        }
        catch
        {
            return json; // fallback raw string
        }
    }
}

