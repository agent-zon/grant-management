# Tool Name Dot Notation Fix

## Problem
CDS was rejecting form submissions with tool names containing dots (like `tool_logs.analyze`) because it interpreted them as nested object properties that don't exist in the Grants entity.

### Error:
```
Error: Property "tool_logs.analyze" does not exist in AuthorizeService.Grants
```

## Root Cause
HTML form field names like `tool_logs.analyze` were being interpreted by CDS validation as:
```javascript
{
  tool_logs: {
    analyze: "on"
  }
}
```

But the Grants entity doesn't have nested properties like `tool_logs.analyze`.

## Solution
Replace dots with underscores in form field names, then map them back to original tool names during processing.

### 1. Form Field Name Generation
**Before:**
```jsx
<input name={`tool_${toolName}`} /> // tool_logs.analyze
```

**After:**
```jsx
<input name={`tool_${toolName.replace(/\./g, '_')}`} /> // tool_logs_analyze
```

### 2. Processing Logic Update
**Before:**
```javascript
const consentKey = `tool_${toolName}`; // tool_logs.analyze
```

**After:**
```javascript
const consentKey = `tool_${toolName.replace(/\./g, '_')}`; // tool_logs_analyze
```

## Example Mapping

| Original Tool Name | Form Field Name | Consent Key |
|-------------------|----------------|-------------|
| `logs.analyze` | `tool_logs_analyze` | `tool_logs_analyze` |
| `system.monitor` | `tool_system_monitor` | `tool_system_monitor` |
| `user.manage` | `tool_user_manage` | `tool_user_manage` |
| `config.read` | `tool_config_read` | `tool_config_read` |

## Form Data Processing

### Input (from form):
```json
{
  "_method": "put",
  "tool_logs_analyze": "on",
  "tool_system_monitor": "on", 
  "tool_user_manage": "on",
  "clientId": "demo-client-app",
  "duration": "24"
}
```

### Processing:
```javascript
// For tool name "logs.analyze"
const consentKey = `tool_${"logs.analyze".replace(/\./g, '_')}`; // "tool_logs_analyze"
const granted = Boolean(userConsent["tool_logs_analyze"]); // true
```

### Output (stored in grant):
```json
{
  "type": "mcp-tools",
  "tools": {
    "logs.analyze": true,     // Original tool name preserved
    "system.monitor": true,
    "user.manage": true
  }
}
```

## Benefits
1. ✅ **CDS Validation Passes**: No more nested property errors
2. ✅ **Tool Names Preserved**: Original dot notation maintained in storage
3. ✅ **Backward Compatible**: Existing tool definitions unchanged
4. ✅ **User Friendly**: Form still shows original tool names in labels

## Files Modified
- `srv/authorize.tsx`: Updated form field name generation and processing logic
- Added debugging logs to trace the consent processing flow

The fix ensures that tool names with dots (common in MCP tools like `logs.analyze`, `system.monitor`) work correctly with CDS validation while preserving the original tool names in the stored authorization details.
