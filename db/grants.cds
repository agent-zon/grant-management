namespace sap.scai.grants;
using { managed, cuid } from '@sap/cds/common';
using { sap,User } from '@sap/cds/common';
/*
managed give the createdBy createdAt, modifiedBy modifiedAt
cuid give the ID:UUID
*/ 
@cds.autoexpose :true
// Grants as primary entity - not a projection
entity Grants: managed {
  key id : String @cds.primary.key;
   
  client_id: String=max(requests.client_id);
  risk_level:String=max(requests.risk_level);
  status:String enum { active; revoked; }= revoked_at is null ? 'active' : 'revoked';
  revoked_at: DateTime;
  revoked_by: User;
  subject: User;
  actor: String=consents.request.requested_actor;
  scope:String;
  consents: Composition of many Consents on consents.grant_id = $self.id;
  requests: Composition of many AuthorizationRequests on requests.grant = $self;
  authorization_details: Composition of many AuthorizationDetail on authorization_details.consent.grant_id = $self.id;
}


 
 entity AuthorizationRequests: cuid, managed {
  //raw request fields
  client_id: String;
  redirect_uri: String;
  request_uri: String;
  scope: String; // space-separated scopes
  state: String; // optional state parameter
  code_challenge: String; // PKCE code challenge
  code_challenge_method: String; // S256
  grant_management_action: String; // create, merge, replace
  authorization_details: String; // JSON array of authorization_details objects
  requested_actor: String; // OAuth on-behalf-of: actor URN (e.g., urn:agent:finance-v1)
  expires_at: String @cds.on.insert: $now; // expires in 90 seconds
  status: String @cds.on.insert: 'pending'; // pending, used, expired
  response_type: String; // code, token
  risk_level: String @cds.on.insert: 'low'; // low, medium, high
  subject_token_type: String;
  subject_token: String;
  subject: User;
  expires_in: Integer;

   
  // calculated fields and associations
  grant: Association to Grants;
  consent: Association to Consents on consent.request = $self;
  access: array of AuthorizationDetailRequest; // Parsed authorization details
}

 
// milliseconds
type Timespan: Integer;

entity RiskAnalysis:cuid,managed {
  grant: Association to Grants;
  risk: Integer;
  analysis: String;
  data: Map;
  provider: String;
}



entity GrantUsage:cuid,managed {
  grant: Association to Grants;
  ip: String;
  user_agent: String; 
  client_id: String;
}
  
 
@cds.autoexpose :true
entity Consents:cuid,managed {
  @mandatory
  key grant_id: String;
  // Association to Grant (primary relationship)
  grant: Association to Grants on grant.id = $self.grant_id; 
  request: Association to AuthorizationRequests;
  scope: String; 
  authorization_details: Composition of many AuthorizationDetail on authorization_details.consent = $self;
  duration: Timespan;
  subject: User; //@cds.on.insert: $user;
  previous_consent: Association to Consents; // Reference to the previous consent for this grant
  @calculated
  redirect_uri: String=request.redirect_uri;
  
 }



@cds.autoexpose :true
entity AuthorizationDetail:cuid,managed, AuthorizationDetailMcpTools, AuthorizationDetailFileSystem, AuthorizationDetailDatabase, AuthorizationDetailApi {
  consent: Association to Consents;
  type: String(20);
  locations: array of String;
  actions: array of String;

  identifier: String;
  privileges: array of String;
  resources: array of String; 
}


aspect AuthorizationDetailDatabase {
  // type: String enum { database };
  databases: array of String; // Database names
  schemas: array of String;   // Schema names
  tables: array of String;    // Table names
}

aspect AuthorizationDetailApi {
  // type: String enum { api };
  urls: array of String;    // API endpoint URLs
  protocols: array of String; // HTTP, HTTPS, WebSocket, gRPC, etc.
}
 
aspect AuthorizationDetailMcpTools {
  // type: String enum { mcp };
  transport: String;        // Transport protocol
  tools: Map;              // tool_name -> boolean (granted/denied)
  server: String;
}


aspect AuthorizationDetailFileSystem {
  // type: String enum { fs };
  roots: array of String;   // File system root paths
  permissions:  {
    read: Boolean;
    write: Boolean;
    execute: Boolean;
    delete: Boolean;
    list: Boolean;
    create: Boolean;
  }; // read, write, execute, delete, etc.
}





 




// entity MyGrants as SELECT from Grants where modifiedBy = $user;


type AuthorizationDetailRequest: MCPToolAuthorizationDetailRequest, FileSystemAuthorizationDetailRequest, DatabaseAuthorizationDetailRequest, ApiAuthorizationDetailRequest {
  type: Association to AuthorizationDetailType;
  locations: array of String;
  actions: array of String;

}
 
entity AuthorizationDetailType: sap.common.CodeList {
    key code : String(20) enum { 
      mcp;
      fs;
      database;
      api;
      grant_management;
      file_access;
      data_access;
      network_access;
    };
    template: LargeString; // Mustache template for future use
    description: String; // Human-readable description
  
    riskLevel: String enum { low; medium; high; }; // Risk assessment
    category: String; // Category for grouping (mcp-integration, api-access, etc.)
    //WHY?
}


aspect MCPToolAuthorizationDetailRequest {
  server: String;
  transport: String;
  tools: Map; 
  locations: array of String;
  actions: array of String;
}


aspect FileSystemAuthorizationDetailRequest {
  permissions:{
    read: RARClaim;
    write: RARClaim;
    delete: RARClaim;
    execute: RARClaim;
    list: RARClaim;
    create: RARClaim;
  };
  roots: array of String;
}

aspect DatabaseAuthorizationDetailRequest {
   databases: array of String;
   schemas: array of String;
   tables: array of String;
}


aspect ApiAuthorizationDetailRequest {
  urls: array of String;
  protocols: array of String;
}


type RARClaim {
  essential: Boolean;
}