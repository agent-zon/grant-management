namespace GrantMcpLayer.Models;

public class McpServerInfo
{
    public string Name { get; set; }
    
    public string Type { get; set; }
    
    public string Url { get; set; }
    
    public string Command { get; set; }
    
    public string Arguments { get; set; }

    public bool IsInternalProxy { get; set; } = false;
    public Dictionary<string, string?> Environments { get; set; }
}