namespace com.sap.agent.grants;
using {
  cuid,
  managed,
  temporal
} from '@sap/cds/common';

// Grant Management API entities following OAuth 2.0 Grant Management specification

// Grant entity following OAuth 2.0 Grant Management specification
 
entity Grants : cuid, managed,temporal { 
  clientId: String(255);
  status:  GrantStatus; 
  expiresAt: Timestamp;
  lastUsed: Timestamp;
  sessionId: String(255);
  ip: String(255);
  subject: Association to Identity;
  actor: Association to Identity;
  
  // Grant scopes relationship
  scopes: Association to many GrantScopes;
  
  // Authorization details relationship  
  authorizationDetails: Association to many ToolGrantAuthorizationDetails;
}



type GrantStatus: String(20) enum {
  active;  
  inactive;
  revoked;
  expired;  
};

// Grant Scopes entity to model scope-resource relationships per OAuth 2.0 Grant Management spec
entity GrantScopes : cuid {
  grant: Association to Grants;
  scope: String(500); // The scope value (e.g., "contacts read write", "openid")
  resources: String(1000); // JSON array of resource indicators per RFC 8707
}

 entity Identity : managed, cuid {
  type: IdentityType;
  
}

entity AgentIdentity: SystemIdentity {
  name: String(255);
  url: String(255);
}

entity UserIdentity: Identity {
  email: String(255);
  phone: String(255);
  address: String(255);
  name: String(255);
}

entity DeviceIdentity: Identity {
  name: String(255);
  user_agent: String(255);
  ip: String(255);
}

entity SystemIdentity: Identity {
  name: String(255);
  publicKey: String(255);
  instanceId: String(255); 

}

entity ServiceIdentity: Identity {
  serviceId: String(255);
  name: String(255);
  type: String(255);
}

type IdentityType: String(20) enum {
  user;
  agent;
  system;
  device;
};

using { sap.common.CodeList } from '@sap/cds/common';
entity IdentityTypes : CodeList {
  key code: Integer;
}
 

// Grant Authorization Details following Rich Authorization Requests (RAR) specification
entity ToolGrantAuthorizationDetails:cuid {
   grant: Association to Grants;
   
   // OAuth 2.0 Grant Management specification fields
   type: String(100); // Authorization detail type (e.g., "account_information", "payment_initiation")
   actions: String(1000); // JSON array of actions (e.g., ["list_accounts", "read_balances"])
   locations: String(1000); // JSON array of locations/endpoints (e.g., ["https://example.com/accounts"])
   
   // Additional metadata for tool/authorization detail management
   toolName: String(255); // Name of the tool/authorization detail
   toolDescription: String(1000); // Description of the tool
   riskLevel: String(20) enum { low; medium; high; }; // Risk level
   category: String(50); // Category (e.g., "file-system", "data-access", "system-admin", "network", "analytics")
 }
 
// Authorization Requests for staging create/merge/replace flows
entity AuthorizationRequests : cuid, managed {
  status: RequestStatus;
  grant: Association to Grants;
  sessionId: String(255);
  userId: String(255);
  workloadId: String(255);
  reason: String(1000);
  authorizationDetails: String(8000); // JSON array per RAR
  requestUri: String(1000); // PAR request_uri if used
  shortCode: String(100); // optional short code for UX
  expiresAt: Timestamp;
}

type RequestStatus: String(20) enum {
  pending;
  approved;
  denied;
  expired;
}

