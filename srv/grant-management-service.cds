using com.sap.agent.grants as grants from '../db/schema';

@path: '/api'
@requires: ['authenticated-user', 'system-user']
@impl: 'srv/grant-management-service.js'
service GrantManagementService {
  
  // OAuth 2.0 Grant Management API entities
  // Standard CRUD operations (GET, POST, PUT, DELETE) are automatically provided by CDS
  
  // Main grant entity - GET /grants/{grant_id} and DELETE /grants/{grant_id} are automatically available
  @path: '/'
  entity Grants as projection on grants.Grants;
  
  // Supporting entities for grant management
  entity Identity as projection on grants.Identity;
  entity GrantScopes as projection on grants.GrantScopes;
  entity ToolGrantAuthorizationDetails as projection on grants.ToolGrantAuthorizationDetails;
  @path: '/requests'
  entity AuthorizationRequests as projection on grants.AuthorizationRequests;
  
  // Server metadata endpoint (Section 7.1)
  @requires: 'authenticated-user'
  function getMetadata() returns GrantManagementMetadata;
  
  // Get available authorization detail types
  @requires: 'grant_management_query'
  function getAuthorizationDetailTypes() returns array of AuthorizationDetailTypeInfo;
  @requires: 'grant_management_create'
  action CreateRequest(data: AuthorizationRequestInput) returns AuthorizationRequestResponse;
  @requires: 'grant_management_update'
  action DecideRequest(ID: String, approve: Boolean, actor: String, note: String) returns RequestDecisionResponse;
  
  // Note: Token management (issuing/revoking access/refresh tokens) is NOT part of 
  // the OAuth 2.0 Grant Management API specification. Tokens are managed through:
  // - Standard OAuth 2.0 token endpoint for issuance
  // - RFC 7009 token revocation endpoint for revocation
  // - Grant Management API only handles grant lifecycle (query, revoke, update, replace)
}

// Response types for OAuth 2.0 Grant Management API specification

// Server metadata as per Section 7.1 of OAuth 2.0 Grant Management spec
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

// Authorization detail type information
type AuthorizationDetailTypeInfo {
  type: String;
  name: String;
  description: String;
  risk_level: String;
  category: String;
  actions: array of String;
  locations: array of String;
}

// Request and decision payloads
type AuthorizationRequestInput {
  sessionId: String;
  userId: String;
  workloadId: String;
  reason: String;
  grantId: String; // optional when merging into existing grant
  authorization_details: LargeString; // JSON array per RAR
}

type AuthorizationRequestResponse {
  requestId: String;
}

type RequestDecisionResponse {
  success: Boolean;
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
