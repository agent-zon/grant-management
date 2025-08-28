# Consent Management System - User Stories & Scenarios

## Overview
This project demonstrates a comprehensive consent management system for AI agents accessing MCP (Model Context Protocol) tools. The system ensures that agents can only access tools and data that users have explicitly granted permission for.

## User Story: US - Excessive Agency - Request Scope Grants from End User

**As a:** End-User  
**I want to:** Grant specific scopes to the agent  
**So that:** I am sure it is not misusing my credentials to achieve its goal

### Description
When an agent wants to call some MCP tools to achieve a goal, the tools might be divided into scopes. We would like the end user to explicitly grant those scopes to the agent for the duration of this specific ask or chat to make sure that the agent does not call other scoped tools without the user consent.

For instance, if we have an MCP server with several tools and two scopes: `tools:read` & `tools:write`, then we would like that when the agent attempts to call those tools, the MCP guard will return an authorization request back to the user via a link. The user will click this link and will navigate to the IDP where they will be able to grant access to either both scopes or just one of them.

Then, the MCP guard will adhere to those grants given by the user and will be able to execute only the tools that are permissible by the scope which the end-user granted.

## Acceptance Criteria

### Feature: End-user scope control for agent tool calls

**Background:**
- The following MCP tools are protected by scopes:
  | Tool | Required Scope |
  |------|----------------|
  | ListFiles | tools:read |
  | CreateFile | tools:write |
  | ReadFile | tools:read |
  | UpdateFile | tools:write |
  | DeleteFile | tools:write |

- An authenticated end-user "Eve" is in an active chat session "S123" with agent "A1"
- The IDP authorization endpoint is available at "https://idp.example.com/auth"
- The MCP guard is configured to request end-user consent whenever a required scope is missing

### Scenarios

#### 1. Happy Path - User grants all requested scopes
**When:** Agent "A1" attempts to call ListFiles and CreateFile  
**Then:** The MCP guard responds with an authorization link requesting scopes "tools:read tools:write"  
**When:** Eve follows the link and approves both scopes  
**Then:** The MCP guard receives a valid authorization code  
**And:** The MCP guard issues an access token for scopes "tools:read tools:write" that is bound to session "S123"  
**When:** Agent "A1" calls ListFiles during session "S123"  
**Then:** The MCP guard allows the call  
**When:** Agent "A1" calls CreateFile during session "S123"  
**Then:** The MCP guard allows the call

#### 2. Partial Approval - User grants only a subset of requested scopes
**When:** Agent "A1" requests scopes "tools:read tools:write"  
**And:** The MCP guard sends an authorization link to Eve  
**And:** Eve approves only "tools:read"  
**Then:** The MCP guard issues a token containing "tools:read" and omits "tools:write"  
**When:** Agent "A1" calls ListFiles  
**Then:** The MCP guard permits the call  
**When:** Agent "A1" calls CreateFile  
**Then:** The MCP guard denies the call with HTTP 403 "insufficient_scope"

#### 3. User Denial - User denies the authorization request
**When:** Agent "A1" requests scopes "tools:read tools:write"  
**And:** Eve follows the authorization link and selects "Deny"  
**Then:** The MCP guard does not issue an access token  
**And:** The MCP guard returns an error "authorization_denied" to Agent "A1"  
**And:** Agent "A1" cannot call any MCP tool in session "S123"

#### 4. Proactive Guard Enforcement - Agent tries to call scoped tool without consent
**Given:** Agent "A1" has no valid access token for session "S123"  
**When:** Agent "A1" calls CreateFile  
**Then:** The MCP guard blocks the call with HTTP 401 "authorization_required"  
**And:** The guard returns an authorization link to Eve requesting "tools:write"

#### 5. Session-bound Token - Token validity limited to chat session
**Given:** Agent "A1" obtained a token for "tools:read" during session "S123"  
**When:** Session "S123" ends  
**And:** Agent "A1" reuses the same token in a new session "S124"  
**Then:** The MCP guard rejects the token with HTTP 401 "invalid_session"

#### 6. Token Expiration - Token expires after configured lifetime
**Given:** The MCP guard issued a token to Agent "A1" with a lifetime of 15 minutes  
**And:** 15 minutes have elapsed  
**When:** Agent "A1" calls ListFiles  
**Then:** The MCP guard denies the call with HTTP 401 "token_expired"  
**And:** The guard returns a new authorization link to Eve requesting "tools:read"

## Technical Implementation

### MCP Guard Components
1. **Authorization Interceptor**: Intercepts all agent tool calls
2. **Scope Validator**: Validates required scopes against granted permissions
3. **Consent Manager**: Handles user consent flows and token management
4. **Session Manager**: Manages session-bound tokens and expiration

### Consent Flow Architecture
1. Agent attempts to call MCP tool
2. MCP Guard checks for valid session token with required scope
3. If missing, Guard generates authorization link
4. User navigates to IDP and grants/denies scopes
5. Guard receives authorization code and issues session-bound token
6. Subsequent tool calls are validated against granted scopes

### Security Considerations
- Tokens are bound to specific chat sessions
- Configurable token expiration (default: 15 minutes)
- Granular scope-based access control
- Audit logging for all consent decisions
- Secure token storage and transmission