namespace GrantMcpLayer.Models;

public class ToolActivationConsent
{
    public required string AgentId { get; set; }
    public required string ToolName { get; set; }
    public required string? ConversationId { get; set; }
    public required string? UserId { get; set; }
    public required DateTime ValidUntil { get; set; }
}