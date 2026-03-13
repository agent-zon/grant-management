using policies from '../db/schema';

@path: '/policies'
service PoliciesService {
  
  @odata.draft.enabled: false
  entity AgentPolicies as projection on policies.AgentPolicies;
  
  @odata.draft.enabled: false  
  entity YamlTemplates as projection on policies.YamlTemplates;
  
  // Actions for YAML template management
  action getYamlTemplates() returns array of String;
  action getYamlTemplate(filename: String) returns {
    value: String;
  };
  
  // Actions for MCP template management
  action getMcpTemplate(filename: String) returns {
    value: String;
  };
  
  // Actions for MCP Hub integration
  action getMcpHubData() returns {
    value: String;
  };
  
  // Actions for Git repository integration
  action getAgentManifest(agentId: String) returns {
    value: String;
  };

  action getGitFile(filePath: String) returns {
    value: String;
  };

  action listAllAgents() returns array of {
    agentId: String;
    modifiedAt: String;
  };
  
  // Actions for MCP Hub cards generation
  action generateMcpHubCards(agentId: String) returns {
    message: String;
    cards: array of {
      name: String;
      fileName: String;
      filePath: String;
      toolsCount: Integer;
      source: String;
    };
  };
  
  // Actions for Git operations on MCP Hub cards
  action commitMcpHubCards(commitMessage: String, agentId: String) returns {
    message: String;
    committed: Boolean;
    filesCommitted: array of String;
  };
}