# STATUS

- Created: 2025-10-23
- Last Updated: 2025-10-23 12:15 UTC
- State: In Review

## Progress
- [x] Serve /api-docs as static Scalar page (dev and hybrid)
- [x] Remove portal /api-docs route and route entry
- [x] Update xs-app.json to serve /api-docs from localDir
- [x] Add static api-docs/index.html under portal public and router resources
- [x] Add OpenAPI generation/copy scripts
- [x] Keep "API Documentation" link on home and grants
- [ ] Update docs with testing steps and outcomes

## Next Steps
- Run `npm run openapi:prepare`
- Test dev: http://localhost:5173/api-docs
- Test hybrid: http://localhost:9000/api-docs
- Document auth behavior if adjustments needed
