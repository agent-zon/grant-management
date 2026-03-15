namespace policies;

@cds.persistence.skip
entity AgentPolicies {
  key agentId: String(100);
  policies: LargeString;  // ODRL JSON
  yaml: LargeString;     // YAML JSON
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
   versions: composition of many Policies on versions.agentId = agentId;
}

@cds.persistence.skip
@cds.autoexpose
entity Policies {
  key version: String(32);
  agentId: String(100);
}

entity YamlTemplates {
  key filename: String(255);
  content: LargeString;
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}