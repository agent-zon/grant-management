# End-to-End Grant Merge Test Flow

## Test Scenario
1. **Create Initial Grant**: Use basic authorization to get a grant_id
2. **Merge with Existing Grant**: Use the grant_id to add new permissions
3. **Verify Merged Grant**: Check that permissions are combined

## Step 1: Create Initial Grant

### 1.1 PAR Request (Create)
```bash
curl -X POST http://localhost:4004/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic YWxpY2U6YWxpY2U=" \
  -d "response_type=code" \
  -d "client_id=test-client-merge" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "scope=tools:read tools:write" \
  -d "grant_management_action=create" \
  -d "requested_actor=urn:agent:initial-bot" \
  -d "authorization_details=[{\"type\":\"mcp\",\"server\":\"https://tools.example.com\",\"tools\":{\"file.read\":{\"essential\":true},\"file.write\":{\"essential\":true}},\"actions\":[\"run\"],\"locations\":[\"workspace\"]}]"
```

**Expected Response:**
```json
{
  "request_uri": "urn:ietf:params:oauth:request_uri:XXXXXXXX",
  "expires_in": 90
}
```

### 1.2 Authorization Request
```bash
curl -X POST http://localhost:4004/oauth-server/authorize \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic YWxpY2U6YWxpY2U=" \
  -d "client_id=test-client-merge" \
  -d "request_uri=urn:ietf:params:oauth:request_uri:XXXXXXXX"
```

### 1.3 Grant Consent (via UI)
- Visit the authorization URL
- Grant consent
- Get authorization code

### 1.4 Token Exchange
```bash
curl -X POST http://localhost:4004/oauth-server/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=test-client-merge" \
  -d "code=CONSENT_CODE"
```

**Expected Response:**
```json
{
  "access_token": "at_XXXXXXXX:gnt_YYYYYYYY",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "tools:read tools:write",
  "grant_id": "gnt_YYYYYYYY"
}
```

**Save the grant_id for Step 2!**

## Step 2: Merge with Existing Grant

### 2.1 PAR Request (Merge)
```bash
curl -X POST http://localhost:4004/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic YWxpY2U6YWxpY2U=" \
  -d "response_type=code" \
  -d "client_id=test-client-merge" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "scope=file_access data_export" \
  -d "grant_management_action=merge" \
  -d "grant_id=gnt_YYYYYYYY" \
  -d "requested_actor=urn:agent:enhanced-bot" \
  -d "authorization_details=[{\"type\":\"fs\",\"roots\":[\"/workspace\",\"/home/user\"],\"actions\":[\"read\",\"write\",\"list\"],\"permissions\":{\"read\":{\"essential\":true},\"write\":{\"essential\":true}}},{\"type\":\"api\",\"urls\":[\"https://data.api.example.com/*\"],\"protocols\":[\"HTTPS\"],\"actions\":[\"export\",\"backup\"]}]"
```

### 2.2 Authorization Request (Merge)
```bash
curl -X POST http://localhost:4004/oauth-server/authorize \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic YWxpY2U6YWxpY2U=" \
  -d "client_id=test-client-merge" \
  -d "request_uri=urn:ietf:params:oauth:request_uri:XXXXXXXX"
```

**Expected UI:**
- Shows existing permissions: `tools:read tools:write`
- Shows new permissions being added: `file_access data_export`
- Merge context clearly indicated

### 2.3 Grant Merged Consent
- Visit authorization URL
- See existing permissions preserved
- See new permissions to be added
- Grant consent for merge

### 2.4 Token Exchange (Merged)
```bash
curl -X POST http://localhost:4004/oauth-server/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=test-client-merge" \
  -d "code=MERGED_CONSENT_CODE"
```

**Expected Response:**
```json
{
  "access_token": "at_XXXXXXXX:gnt_YYYYYYYY",
  "token_type": "Bearer", 
  "expires_in": 3600,
  "scope": "tools:read tools:write file_access data_export",
  "grant_id": "gnt_YYYYYYYY"
}
```

## Step 3: Verify Merged Grant

### 3.1 Check Grants Table
```bash
curl -s "http://localhost:4004/grants-management/Grants" \
  -u "alice:" \
  -H "Accept: application/json"
```

**Expected:**
- Same grant_id: `gnt_YYYYYYYY`
- Merged scope: `tools:read tools:write file_access data_export`
- Updated granted_at timestamp

## Success Criteria
- ✅ Initial grant created with tools permissions
- ✅ Merge request preserves existing permissions
- ✅ New permissions added to existing grant
- ✅ Same grant_id used throughout
- ✅ Grants table reflects merged permissions
- ✅ UI shows merge context clearly

## Implementation Status
- ✅ PAR endpoint supports grant_id parameter
- ✅ Authorize endpoint handles merge action
- ✅ Consent creation merges scopes
- ✅ Grants table automatically updates
- ✅ Demo client has merge test configuration
