using com.sap.agent.grants as entity from '../db/schema';

@path: '/api'
@requires: ['authenticated-user', 'system-user']
@protocol: 'rest'
service GrantManagementService {
  
  // OAuth 2.0 Grant Management API entities
  // Standard CRUD operations (GET, POST, PUT, DELETE) are automatically provided by CDS

    // Main grant entity - GET /grants/{grant_id} and DELETE /grants/{grant_id} are automatically available
  entity grants as projection on entity.Grants
  {
    ID as grant_id,
    clientId as client_id,
    actor.ID as act,
    subject.ID as sub, 
    sessionId as sid,
    status,
    createdAt as created_at,
    modifiedAt as modified_at,
    expiresAt as expires_at,
    authorizationDetails as authorization_details,
    scopes as scope,
   {
      ID as sub,
      actor.type ,
      actor.name ,
    } as actor,
    subject,
  }
  
  // Supporting entities for grant management
  entity Identity as projection on entity.Identity;
  entity ToolGrantAuthorizationDetails as projection on entity.ToolGrantAuthorizationDetails;
  entity GrantScopes as projection on entity.GrantScopes;

  // Server metadata endpoint (Section 7.1)
  function metadata() returns GrantManagementMetadata;
  
  
  // Note: Token management (issuing/revoking access/refresh tokens) is NOT part of 
 }

// Response types for OAuth 2.0 Grant Management API specification
type GrantManagementMetadata {
  grant_management_actions_supported: array of String;
  grant_management_endpoint: String;
  grant_management_action_required: Boolean;
  server_info: ServerInfo;
}

type ServerInfo {
  name: String;
  version: String;
  supported_scopes: array of String;
}

 

// Note: Entity projections automatically provide standard CRUD operations:
// - GET /grants/{grant_id} - Query grant status (returns entity data)
// - DELETE /grants/{grant_id} - Revoke grant (deletes entity)
// - POST /grants - Create grant (creates entity)
// - PUT /grants/{grant_id} - Update grant (updates entity)
// 
// Token management is handled by standard OAuth 2.0 endpoints:
// - Token issuance: Standard OAuth 2.0 token endpoint (returns grant_id in response)
// - Token revocation: RFC 7009 token revocation endpoint
