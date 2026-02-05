namespace sap.scai.grants.discovery;

@cds.autoexpose entity Tools {
  key name: String;
  
  schema: String; // JSON schema for the tool
  enabled: Boolean default true;
  agent: Association to Agents ;
}

entity Agents {
  key id: String;
  description: String;
  url: String;
  enabled: Boolean default true;
  tools: Composition of many Tools on tools.agent = $self;
  virtual links: Links;
  virtual meta:{
    agent: String;
    grant_id: String;
    host: String; 
  }
}


type Links {
  host: String;
  self: String;
  mcp: String; 
}
