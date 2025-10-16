# Template Input Fields Update

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [IMPLEMENTATION]  
**Timeline**: 03 of XX - Updated all templates with proper input field capture

## Overview

Updated all authorization detail templates (fs, database, api, mcp) to include hidden input fields for comprehensive field capture, following the pattern established in mcp.tsx.

## Changes Made

### ✅ 1. File System Template (`srv/templates/fs.tsx`)

Added hidden inputs for fs-specific fields:
```tsx
{/* Hidden inputs for field capture */}
<input type="hidden" name={`authorization_details[${index}].roots`} value={JSON.stringify(detail.roots || [])} />
<input type="hidden" name={`authorization_details[${index}].actions`} value={JSON.stringify(detail.actions || [])} />
<input type="hidden" name={`authorization_details[${index}].locations`} value={JSON.stringify(detail.locations || [])} />
```

**Fields Captured:**
- `roots`: File system root paths
- `actions`: Allowed file operations
- `locations`: File locations/paths

### ✅ 2. Database Template (`srv/templates/database.tsx`)

Added hidden inputs for database-specific fields:
```tsx
{/* Hidden inputs for field capture */}
<input type="hidden" name={`authorization_details[${index}].databases`} value={JSON.stringify(detail.databases || [])} />
<input type="hidden" name={`authorization_details[${index}].schemas`} value={JSON.stringify(detail.schemas || [])} />
<input type="hidden" name={`authorization_details[${index}].tables`} value={JSON.stringify(detail.tables || [])} />
<input type="hidden" name={`authorization_details[${index}].actions`} value={JSON.stringify(detail.actions || [])} />
<input type="hidden" name={`authorization_details[${index}].locations`} value={JSON.stringify(detail.locations || [])} />
```

**Fields Captured:**
- `databases`: Database names
- `schemas`: Schema names  
- `tables`: Table names
- `actions`: Database operations
- `locations`: Database locations

### ✅ 3. API Template (`srv/templates/api.tsx`)

Added hidden inputs for API-specific fields:
```tsx
{/* Hidden inputs for field capture */}
<input type="hidden" name={`authorization_details[${index}].urls`} value={JSON.stringify(detail.urls || [])} />
<input type="hidden" name={`authorization_details[${index}].protocols`} value={JSON.stringify(detail.protocols || [])} />
<input type="hidden" name={`authorization_details[${index}].actions`} value={JSON.stringify(detail.actions || [])} />
<input type="hidden" name={`authorization_details[${index}].locations`} value={JSON.stringify(detail.locations || [])} />
```

**Fields Captured:**
- `urls`: API endpoint URLs
- `protocols`: Communication protocols (HTTP, HTTPS, WebSocket, gRPC)
- `actions`: API operations
- `locations`: API locations

### ✅ 4. MCP Template (`srv/templates/mcp.tsx`)

Added hidden inputs for MCP-specific fields:
```tsx
{/* Hidden inputs for field capture */}
<input type="hidden" name={`authorization_details[${index}].server`} value={detail.server || ''} />
<input type="hidden" name={`authorization_details[${index}].transport`} value={detail.transport || ''} />
<input type="hidden" name={`authorization_details[${index}].locations`} value={JSON.stringify(detail.locations || [])} />
<input type="hidden" name={`authorization_details[${index}].actions`} value={JSON.stringify(detail.actions || [])} />
```

**Fields Captured:**
- `server`: MCP server URL
- `transport`: Transport protocol
- `locations`: MCP locations
- `actions`: MCP actions

**Note:** MCP tools are handled separately through the interactive checkboxes in the template.

### ✅ 5. Authorization Handler Cleanup (`srv/authorization/handlers.authorize.tsx`)

Removed duplicate input field generation from the handler since templates now handle this:

**Before:**
```tsx
// Complex conditional input generation for each type
{type_code === 'mcp' && (/* MCP inputs */)}
{type_code === 'fs' && (/* FS inputs */)}
// ... etc
```

**After:**
```tsx
return <>
  <input type="hidden" name={`authorization_details[${index}].type`} value={type_code!} />
  <Component index={index} {...authorizationDetails} />
</>;
```

## Benefits Achieved

### 1. **Consistent Pattern**
- All templates follow the same input capture pattern
- Centralized field capture within each template
- Cleaner separation of concerns

### 2. **Complete Field Capture**
- Every authorization detail field is now captured as input
- No missing fields for any authorization detail type
- Comprehensive audit trail for all consent decisions

### 3. **Maintainability**
- Template-specific fields are handled in their respective templates
- Easier to add new fields to specific types
- Reduced complexity in the authorization handler

### 4. **Data Integrity**
- All fields are properly JSON stringified for arrays/objects
- Consistent handling of optional fields with fallbacks
- Proper indexing for form submission

## Technical Implementation Details

### Input Field Naming Convention
```
authorization_details[${index}].${fieldName}
```

### Data Serialization
- **Arrays**: `JSON.stringify(detail.fieldName || [])`
- **Objects**: `JSON.stringify(detail.fieldName || {})`
- **Strings**: `detail.fieldName || ''`

### Index Propagation
- Templates now receive the correct `index` parameter
- Ensures proper form field naming for HTMX submission
- Maintains consistency across all authorization details

## Validation

All templates now capture their specific fields as hidden inputs:
- ✅ **fs**: roots, actions, locations
- ✅ **database**: databases, schemas, tables, actions, locations  
- ✅ **api**: urls, protocols, actions, locations
- ✅ **mcp**: server, transport, locations, actions (+ interactive tools)

This ensures complete consent data capture for audit and compliance purposes while maintaining the existing UI/UX.
