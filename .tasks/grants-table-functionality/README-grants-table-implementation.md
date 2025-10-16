# Grants Table Implementation

## Overview

This implementation makes the grants table functional by creating a calculated view over the Consents data, providing real-time aggregation of consent and usage information.

## Key Components

### 1. Database Schema (`db/grants.cds`)
- **Grants Entity**: Calculated view over Consents with `GROUP BY grant`
- **Data Sources**: Consents, AuthorizationRequests, GrantUsage
- **Aggregation**: Latest consent data per grant ID

### 2. Service Layer (`srv/grants.tsx`, `srv/grants.cds`)
- **GrantsManagementService**: Exposes grants with user restrictions
- **Event Handlers**: Existing handlers now return real data
- **Authentication**: User-filtered grants (`subject = $user`)

### 3. UI Components (`srv/routes/grants.*.tsx`)
- **List View**: Shows all user grants with View/Revoke links
- **Detail View**: Individual grant information
- **Styling**: Consistent underlined links using HTMX

## Data Flow

```
1. PAR Request → AuthorizationRequests (creates gnt_${ulid()})
2. User Consent → Consents (stores grant decision)
3. Grants View → Aggregates data (GROUP BY grant)
4. UI Display → Shows functional grant management
```

## Usage

### Access Grants Management
- **URL**: http://localhost:4004/grants-management/Grants
- **Auth**: Use mock users (alice, bob, etc.)
- **Features**: View grants, navigate to details, revoke active grants

### API Endpoints
- `GET /grants-management/Grants` - List all user grants
- `GET /grants-management/Grants/{id}` - Grant details
- `DELETE /grants-management/Grants/{id}` - Revoke grant

## Technical Approach

### Why Calculated Views?
- **Real-time Data**: Always reflects current consent state
- **No Synchronization**: No manual event handlers needed
- **Performance**: Database-optimized aggregations
- **Maintainability**: Simple, declarative approach

### CDS Pattern Used
```cds
entity Grants as select from Consents {
  grant as ID,
  max(request.client_id) as client_id : String,
  // ... other aggregated fields
} group by grant;
```

This approach follows CDS best practices by letting the database handle aggregations rather than application logic.

## Testing

The implementation is verified working with:
- ✅ Server responding on http://localhost:4004
- ✅ Real data returned from grants endpoint
- ✅ UI displaying functional grant management interface
- ✅ End-to-end authorization flow creating grants

---
*Implementation completed October 2, 2025*
