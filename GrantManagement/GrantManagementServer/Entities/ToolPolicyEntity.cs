namespace GrantManagementServer.Entities;

public class ToolPolicyEntity
{
    public required string AgentId { get; set; }
    public required string ToolName { get; set; }
    
    public required ExplicitConsentPolicy ExplicitConsentPolicy { get; set; }
}

public class ExplicitConsentPolicy
{
    public bool RequiresExplicitConsent { get; set; }
    public TimeSpan? ConsentExpiration { get; set; }
}