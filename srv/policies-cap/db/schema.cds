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
  resources: composition of many VersionResources on resources.agentId = agentId and resources.version = version;
}

@cds.persistence.skip
entity VersionResources {
  key resource: String(255);
  agentId: String(100);
  version: String(32);
  displayName: String(500);
  refFile: String(500);
  enabled: Boolean;
}

entity YamlTemplates {
  key filename: String(255);
  content: LargeString;
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}