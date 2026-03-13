namespace policies;

entity AgentPolicies {
  key agentId: String(100);
  policies: LargeString;  // ODRL JSON
  yaml: LargeString;     // YAML JSON
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}

entity YamlTemplates {
  key filename: String(255);
  content: LargeString;
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}