# Notes: Grants Table Functionality Research

## Initial Observations

### Project Structure Analysis
- Current project appears to be a CDS-based SSR (Server-Side Rendering) application
- Located at `/Users/I347305/aspire-proxy/cds-ssr`
- Contains grants-related files:
  - `db/grants.cds` (208 lines)
  - `srv/grants.tsx` (62 lines) 
  - `srv/grants.cds` (12 lines)
  - Various route handlers in `srv/routes/grants.*`

### Key Questions for Research
1. What is the current structure and purpose of the grants table?
2. How is grantid generated and when during the authorization flow?
3. What are all the sources of consent and usage data?
4. When should new rows be created vs. when should existing rows be updated?
5. What aggregations are currently being performed?

### Files to Investigate
- `db/grants.cds` - Database schema definition
- `srv/grants.tsx` - Service implementation
- `srv/routes/grants.*.tsx` - Route handlers
- `srv/authorize.tsx` - Authorization flow
- Request table structure and relationship to grants

### Research Areas
- CDS best practices for consent/usage data management
- Authorization flow and grantid lifecycle
- Data aggregation patterns in CDS
- Temporal data handling for consent changes

## Investigation Log

### 2025-10-02 - Initial Research Findings

#### Current Data Model Analysis

**Key Entities and Relationships:**
1. **AuthorizationRequests** (cuid, managed) - Entry point for authorization flow
   - Contains `grant: String` field (generated as `gnt_${ulid()}`)
   - Has `consent: Association to Consents` relationship
   - Stores parsed `access: array of AuthorizationDetailRequest`

2. **Consents** (cuid, managed) - Created after user grants consent
   - `grant: String = request.grant` (inherits from AuthorizationRequests)
   - `request: Association to AuthorizationRequests`
   - Contains `authorization_details: array of Map`

3. **Grants** (managed) - Main grants table (currently appears incomplete)
   - `key ID: String` (not UUID like others)
   - `usage: Association to many GrantUsage`
   - `risk: Association to many RiskAnalysis`
   - **CRITICAL FINDING**: No direct creation logic found in codebase

4. **GrantUsage** (cuid, managed) - Usage tracking
   - `grant: Association to Grants`
   - Tracks IP, user_agent, client_id
   - **CRITICAL FINDING**: No usage creation logic found

#### Authorization Flow Analysis

**Current Flow:**
1. **PAR Endpoint** (`/oauth-server/par`): Creates AuthorizationRequests with `grant: gnt_${ulid()}`
2. **Authorize Endpoint** (`/oauth-server/authorize`): Displays consent form
3. **Consent Creation**: User grants consent → Creates Consents record
4. **Token Exchange**: Returns access_token with grant_id

**Missing Link:** No logic found that creates Grants table rows from Consents

#### Data Sources Identified
1. **AuthorizationRequests**: Initial request data, risk_level, client_id, scope
2. **Consents**: User consent decisions, authorization_details, duration
3. **GrantUsage**: Usage tracking data (currently not populated)
4. **RiskAnalysis**: Risk assessment data (currently not populated)

#### Critical Gap Found
The Grants table appears to be designed as an aggregation/summary table but:
- No creation logic exists to populate it from Consents
- No usage tracking implementation found
- No risk analysis population logic
- UI shows grants but data source unclear (possibly mock data)

#### Recommended Implementation Approach

**1. Grant Row Creation Strategy:**
- Create Grants table row when Consent is created (after user grants consent)
- Use `srv.after("POST", Consents, ...)` event handler
- Aggregate data from AuthorizationRequests and Consents

**2. Usage Tracking Strategy:**
- Implement usage tracking when access tokens are used
- Create GrantUsage records on token validation/usage
- Track IP, user_agent, client_id from request context

**3. Data Aggregation Pattern:**
- Use CDS event handlers for real-time aggregation
- Implement `@cds.on.select` for dynamic fields where appropriate
- Consider using calculated fields for frequently accessed aggregations

**4. Event Handler Placement:**
- Add handlers to AuthorizeService for consent-to-grant creation
- Add middleware for usage tracking on token usage
- Use `req.on('succeeded', ...)` for post-transaction aggregation updates

#### CDS Best Practices Applied
- Use managed aspects for audit trail
- Leverage associations for data relationships
- Implement event-driven data population
- Use calculated fields for performance optimization

Created: 2025-10-02
