# Aspire + Devcontainer Local Runtime Changelog

**Created**: 2026-04-23  
**Last Updated**: 2026-04-23  
**Category**: [DEVX] [LOCAL-RUNTIME]  

## Entries

### 2026-04-23
- Initialized task workspace and tracking files.
- Switched `.devcontainer/devcontainer.json` base image to `ghcr.io/cds-zon/dev`.
- Added `.devcontainer/post-create.sh` for deterministic bootstrap (`npm install`, Aspire CLI install hint).
- Installed Aspire CLI and initialized TypeScript AppHost in repository (`aspire init --language typescript`).
- Added `apphost.ts` orchestration for CDS + approuter (+ optional portal) with explicit dependencies.
- Added Aspire command actions for `cds bind` (`bind-auth`, `bind-destination`, `bind-all`) by executing local script.
- Added script `scripts/aspire/cds-bind-run.sh` for K8s-based bindings and optional `--skip-bind`.
- Added local approuter route config `app/router/xs-app.local.json` for non-IAS local execution.
- Updated `app/router/custom-server.js` to accept `XSAPP_CONFIG` override.
- Updated `package.json` scripts for hybrid/local run variants and missing bind orchestration (`bind:all`, `serve:approuter:local`, `serve:cds:hybrid`).
- Added repository-level contributor guidance in `AGENTS.md` (components, run modes, tests).
- Added `docs/LOCAL_ASPIRE.md` with KUBECONFIG + CDS bind + IAS/hybrid local workflow.
- Added CI workflow `.github/workflows/aspire-run.yml` that runs `aspire run` (local mode) in the devcontainer image and validates health endpoints.
- Updated root `README.md` with Aspire orchestration quick-start and local/hybrid usage.
- Added validation notes: `aspire stop --all` can report a non-zero exit even when processes are already terminated; workflow treats stop as best-effort and verifies with `aspire ps`.
