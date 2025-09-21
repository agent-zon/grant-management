using System.Text.Json.Serialization;

namespace GrantManagementServer.Entities;

public enum GrantRequestStatus
{
    Pending,
    Approved,
    Denied,
    Expired
}

public class GrantRequestEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("agent_id")] public string AgentId { get; set; } = null!;

    [JsonPropertyName("session_id")] public string SessionId { get; set; } = null!;

    [JsonPropertyName("requested_scopes")] public List<string> RequestedScopes { get; set; } = new();

    [JsonPropertyName("tools")] public List<string> Tools { get; set; } = new();

    [JsonPropertyName("status")] 
    public GrantRequestStatus Status { get; set; } = GrantRequestStatus.Pending;
    

    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("expires_at")] public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(1);

    [JsonPropertyName("authorization_link")] public string AuthorizationLink { get; set; } = string.Empty;

    [JsonPropertyName("workload_id")] public string? WorkloadId { get; set; }

    [JsonPropertyName("reason")] public string? Reason { get; set; }

    [JsonPropertyName("approved_scopes")] public List<string>? ApprovedScopes { get; set; }

    [JsonPropertyName("denied_scopes")] public List<string>? DeniedScopes { get; set; }

    [JsonPropertyName("decision_timestamp")] public DateTime? DecisionTimestamp { get; set; }

    // Convenience / derived properties (not serialized)
    [JsonIgnore] public bool IsTerminal => Status is GrantRequestStatus.Approved or GrantRequestStatus.Denied or GrantRequestStatus.Expired;
    [JsonIgnore] public double? TimeRemainingSeconds => IsTerminal ? 0 : (ExpiresAt - DateTime.UtcNow).TotalSeconds;

    public bool Approve(IEnumerable<string>? approvedScopes = null, IEnumerable<string>? deniedScopes = null, string? reason = null)
    {
        if (IsTerminal && Status != GrantRequestStatus.Pending) return false;
        Status = GrantRequestStatus.Approved;
        ApprovedScopes = approvedScopes?.Distinct().OrderBy(s => s).ToList() ?? RequestedScopes.ToList();
        DeniedScopes = deniedScopes?.Distinct().OrderBy(s => s).ToList();
        Reason = reason;
        DecisionTimestamp = DateTime.UtcNow;
        return true;
    }

    public bool Deny(IEnumerable<string>? deniedScopes = null, string? reason = null)
    {
        if (IsTerminal && Status != GrantRequestStatus.Pending) return false;
        Status = GrantRequestStatus.Denied;
        DeniedScopes = deniedScopes?.Distinct().OrderBy(s => s).ToList() ?? RequestedScopes.ToList();
        ApprovedScopes = null;
        Reason = reason;
        DecisionTimestamp = DateTime.UtcNow;
        return true;
    }

    public bool Expire()
    {
        if (IsTerminal && Status != GrantRequestStatus.Pending) return false;
        Status = GrantRequestStatus.Expired;
        DecisionTimestamp = DecisionTimestamp ?? DateTime.UtcNow;
        return true;
    }

    public void EnsureExpiredIfNeeded(DateTime? now = null)
    {
        var t = now ?? DateTime.UtcNow;
        if (Status == GrantRequestStatus.Pending && t >= ExpiresAt)
        {
            Status = GrantRequestStatus.Expired;
            DecisionTimestamp = t;
        }
    }
}