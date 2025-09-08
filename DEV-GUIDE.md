# Development Guide: Grant Management System Integration

## Overview

This document outlines the development plan for integrating the Grant Management System with MCP (Model Context Protocol) middleware and testing infrastructure.

## Current State

### What We Have
- ✅ SQLite database integration with grant management
- ✅ Express.js server with domain-based routing structure  
- ✅ Basic API endpoints for grant CRUD operations
- ✅ OpenAPI/Swagger documentation
- ❌ SSR implementation (causing TypeScript/JSX issues)
- ❌ Node module compatibility issues (better-sqlite3)

### Issues to Fix
1. **SSR Complexity**: Drop server-side rendering for now, focus on API-first approach
2. **Module Compatibility**: Fix better-sqlite3 Node.js version mismatch
3. **TypeScript/JavaScript Mix**: Standardize on JavaScript for server-side code
4. **Missing Tests**: No automated testing infrastructure

## Development Plan

### Phase 1: Stabilize Core System (30 minutes)
1. **Drop SSR Implementation**
   - Remove React SSR components from server
   - Keep domain-based API routing structure
   - Simplify to pure API endpoints with basic HTML responses

2. **Fix Module Issues**
   - Rebuild better-sqlite3 for current Node.js version
   - Ensure all imports work correctly
   - Test basic server startup and health endpoints

3. **Create Playwright Tests**
   - Set up Playwright testing framework
   - Create tests for API endpoints
   - Test grant CRUD operations
   - Test consent flow endpoints

### Phase 2: MCP Integration (45 minutes)
1. **Analyze MCP Middleware**
   - Study `mcp-middleware/` consent management system
   - Understand session-based token management
   - Map MCP scopes to our grant system

2. **Integrate Systems**
   - Connect grant management API with MCP consent flow
   - Implement MCP-compatible endpoints
   - Add session token validation
   - Map MCP tool scopes to grant permissions

3. **Update Database Schema**
   - Add MCP-specific fields to grants table
   - Support session-based token management
   - Add tool-scope mapping tables

### Phase 3: Testing & Validation (30 minutes)
1. **Test with MCP Server Example**
   - Start `mcp-server-example/` 
   - Start `mcp-middleware/` with our grant system
   - Test tool calls requiring consent
   - Verify consent flow works end-to-end

2. **Integration Tests**
   - Test agent tool calls without permissions
   - Test consent request generation
   - Test user consent approval/denial
   - Test subsequent authorized tool calls

### Phase 4: Documentation & Commit (15 minutes)
1. **Update Documentation**
   - Update README with MCP integration details
   - Document new API endpoints
   - Add setup instructions for MCP integration

2. **Commit Changes**
   - Clean commit with descriptive message
   - Tag release version
   - Update changelog

## Technical Architecture

### Current Architecture
```
Frontend (React) → Express API → SQLite Database
```

### Target Architecture
```
MCP Agent → MCP Middleware → Grant Management API → SQLite Database
     ↓           ↓                    ↓
MCP Server ← Consent UI ← Grant Management UI
```

### Key Components

1. **Grant Management API** (`server/domains/grant-simple.js`)
   - CRUD operations for grants
   - Session-based token management
   - MCP scope validation

2. **MCP Integration Layer** (new)
   - Translate MCP consent requests to grants
   - Handle session tokens
   - Map tool permissions to scopes

3. **Database Layer** (`server/database.js`)
   - Grant persistence
   - Session token storage
   - Audit logging

4. **Testing Layer** (new)
   - Playwright API tests
   - End-to-end MCP integration tests

## File Structure

```
agent-grants/
├── server/
│   ├── index.js                 # Main Express server
│   ├── database.js             # SQLite database layer
│   └── domains/
│       ├── grant-simple.js     # Grant API endpoints
│       └── mcp-integration.js  # MCP-specific endpoints (new)
├── tests/
│   ├── playwright.config.js    # Playwright configuration (new)
│   └── api/
│       ├── grants.spec.js      # Grant API tests (new)
│       └── mcp-integration.spec.js # MCP integration tests (new)
├── mcp-middleware/             # External MCP consent system
├── mcp-server-example/         # External MCP server for testing
└── docs/
    ├── DEV-GUIDE.md           # This file
    └── MCP-INTEGRATION.md     # MCP integration docs (new)
```

## Success Criteria

### Phase 1 Success
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] API endpoints work with Playwright tests
- [ ] Database operations succeed

### Phase 2 Success  
- [ ] MCP middleware can call our grant API
- [ ] Consent requests create grants in our system
- [ ] Session tokens validate correctly
- [ ] Tool permissions map to grant scopes

### Phase 3 Success
- [ ] End-to-end agent tool call flow works
- [ ] Consent approval creates usable grants
- [ ] Subsequent tool calls succeed with valid grants
- [ ] All tests pass

### Phase 4 Success
- [ ] Clean git commit with all changes
- [ ] Documentation is complete and accurate
- [ ] Setup instructions work for new developers

## Next Steps

1. Start with Phase 1: Fix the current implementation
2. Add Playwright testing infrastructure  
3. Commit stable baseline
4. Begin MCP integration work
5. Test end-to-end with MCP server example

This phased approach ensures we have a stable foundation before adding complexity, and allows for testing at each stage.
