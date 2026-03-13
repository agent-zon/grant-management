using policies from './db/schema';


@path: '/policies'
service PoliciesService {
  
  
  @odata.draft.enabled: false
  entity AgentPolicies as projection on policies.AgentPolicies;

@odata.draft.enabled: false  
  entity YamlTemplates as projection on policies.YamlTemplates;

action getYamlTemplates () returns array of String;

action getYamlTemplate(filename: String) returns { value: String;

};

action getMcpTemplate(filename: String) returns { value: String;

};

action getMcpHubData() returns { value: String;

};

action getAgentManifest(agentId: String) returns { value: String;

};

action getGitFile(filePath: String) returns { value: String;

};

action generateMcpHubCards(agentId: String) returns {
    message: String;

cards: array of { name: String;

fileName: String;

filePath: String;

toolsCount: Integer;

source: String;

};

};

action commitMcpHubCards(commitMessage: String, agentId: String) returns {
    message: String;

committed: Boolean;

filesCommitted: array of String;

};

}