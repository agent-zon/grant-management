# Aspire + Devcontainer + Local Bind Notes

**Created**: 2026-04-23  
**Last Updated**: 2026-04-23  
**Category**: [IMPLEMENTATION]  

## Notes

- Repository already had CDS hybrid scripts and K8s bind commands, but `bind:all` referenced by `setup:local` was missing.
- Approuter startup fails locally without IAS binding; added a local xs-app variant (`app/router/xs-app.local.json`) to support local `aspire run` without cloud identity.
- Aspire TypeScript AppHost can orchestrate JavaScript resources (`addJavaScriptApp`) and provide custom commands (`withCommand`) for bind flows.
- Devcontainer was switched to `ghcr.io/cds-zon/dev` and kept Docker/K8s features enabled for reproducible onboarding.
- Added `AGENTS.md` and `docs/LOCAL_ASPIRE.md` to consolidate developer/agent runbook guidance (components, run modes, tests, and bind workflows).
- Added GitHub Actions workflow to execute `aspire run --detach` smoke checks inside a container based on `ghcr.io/cds-zon/dev`.
