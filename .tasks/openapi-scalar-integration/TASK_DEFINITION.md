# Task Definition: OpenAPI Scalar Integration

**Created**: 2025-10-23
**Last Updated**: 2025-10-23
**Category**: [FEATURE]
**Timeline**: [01] of [01] - Implementation Phase

## Overview

Implement interactive API documentation for the Agent Grants platform using Scalar to display OpenAPI specifications generated from CDS services. The documentation should be accessible in both development and hybrid (production-like) modes.

## Goals

1. Generate OpenAPI 3.0 specifications from all CDS services
2. Set up Scalar API reference viewer for interactive documentation
3. Configure routing for dev and hybrid profiles
4. Test authentication flow in hybrid mode
5. Document implementation and testing results

## Requirements

### Functional Requirements

- [x] Generate OpenAPI specs using `npx cds compile srv --service all -o docs --to openapi`
- [x] Serve OpenAPI specs as static assets in both dev and hybrid modes
- [x] Create `/api-docs` route in portal app
- [x] Integrate Scalar API Reference component
- [x] Display all 4 services: GrantsManagementService, AuthorizationService, AuthService, DemoService
- [x] Support dark theme matching platform design
- [x] Add navigation link from home page

### Technical Requirements

- [x] Install `@scalar/api-reference` package
- [x] Create `app/resources/openapi/` for static files
- [x] Configure approuter routes for hybrid mode
- [x] Set up proper fallback if Scalar fails to load
- [x] Ensure responsive design on mobile/tablet
- [x] Support switching between different service specs

### Authentication Requirements

- [x] Initially set routes to public (no auth)
- [ ] Test if 401 responses trigger IAS auth flow
- [ ] Document whether authentication is needed
- [ ] If needed, update routes to use `authenticationType: "ias"`

## Acceptance Criteria

1. **OpenAPI Generation**: ✅ All CDS services successfully compile to OpenAPI 3.0 format
2. **Dev Mode**: ⏳ Documentation accessible at `http://localhost:5173/api-docs`
3. **Hybrid Mode**: ⏳ Documentation accessible at `http://localhost:9000/api-docs` through approuter
4. **Interactive**: ⏳ Users can explore endpoints, see request/response schemas, and test API calls
5. **Design**: ✅ Matches platform's dark theme and responsive design
6. **Navigation**: ✅ Link visible on home page
7. **Error Handling**: ✅ Graceful fallback if Scalar fails to load
8. **Documentation**: ⏳ Complete implementation guide and testing results

## Out of Scope

- Custom Scalar themes beyond built-in options
- API key management in documentation UI
- Historical API version comparison
- Automated API testing from docs UI
- Real-time API playground with live data

## Dependencies

- CDS CLI for OpenAPI generation ✅
- Scalar API Reference package ✅
- Approuter configuration ✅
- Portal routing system ✅
- IAS authentication (optional, based on testing)

## Risks and Mitigations

| Risk | Impact | Mitigation | Status |
|------|---------|------------|--------|
| Disk space issues | High | Free up space before npm install | ✅ Resolved |
| Scalar compatibility with React 19 | Medium | Use CDN version if npm fails | ✅ Using CDN |
| Authentication complications | Medium | Start with public access, add auth if needed | ⏳ Testing |
| CDS syntax errors | High | Fixed during implementation | ✅ Fixed |

## Success Metrics

- Documentation loads in < 2 seconds
- All API endpoints displayed correctly
- Zero console errors in production build
- Positive user feedback on accessibility

## Implementation Notes

- Fixed CDS syntax error in `db/grants.cds` line 17 (enum default value)
- Using CDN-based Scalar loading for better compatibility
- OpenAPI specs stored in three locations for different access patterns
- All routes configured as public initially for testing

