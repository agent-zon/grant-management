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
  scopes: Association to many GrantScopes on scopes.grant = $self;
  // Authorization details relationship  
  authorizationDetails: Association to many ToolGrantAuthorizationDetails on authorizationDetails.grant = $self;
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
