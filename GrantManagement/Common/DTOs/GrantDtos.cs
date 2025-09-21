using System;
using System.Collections.Generic;

namespace Common.DTOs;

public record CreateGrantDto(string user_id, string scope, string? session_id, string? workload_id, DateTime? expires_at, object? grant_data);
public record UpdateGrantDto(string? scope, object? grant_data);
public record CreateGrantRequestDto(string agent_id, string session_id, IEnumerable<string> requested_scopes, IEnumerable<string> tools, string? workload_id, string? reason);
public record GrantRequestDecisionDto(string status, IEnumerable<string>? approved_scopes, IEnumerable<string>? denied_scopes);

