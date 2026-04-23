# Aspire Devcontainer Local Run - Status

**Created**: 2026-04-23  
**Last Updated**: 2026-04-23  
**Category**: [IMPLEMENTATION]  
**Timeline**: [01] of [03] - In-progress implementation

## Current State

**Status**: COMPLETED

## Completed

- Created dedicated feature branch for this task.
- Audited current devcontainer setup, npm scripts, CDS binding flow, and existing docs.
- Switched devcontainer base image to `ghcr.io/cds-zon/dev`.
- Added `.devcontainer/post-create.sh` to ensure consistent Aspire CLI installation in dev containers.
- Initialized Aspire TypeScript AppHost via `aspire init --language typescript`.
- Added initial `apphost.ts` orchestration for CDS + approuter (+ optional portal).
- Added local/non-IAS approuter route config (`app/router/xs-app.local.json`) and wiring (`XSAPP_CONFIG` support).
- Added bind helper script `scripts/aspire/cds-bind-run.sh` for K8s/hybrid/local command execution.
- Added missing npm scripts (`bind:all`, `serve:cds:hybrid`, `serve:approuter:local`).
- Added `AGENTS.md` with component map and operational run/test matrix.
- Added `docs/LOCAL_ASPIRE.md` with reproducible local + hybrid + KUBECONFIG flows.
- Added `.github/workflows/aspire-run.yml` for CI local-mode Aspire orchestration checks.

## In Progress

- None.

## Remaining

- None.

## Validation Executed

- `npm run aspire:build`
- `npm run serve:cds:local` (startup verified with mocked auth override)
- `npm run serve:approuter:local` (startup verified with local xs-app config)
- `ASPIRE_LOCAL_ONLY=1 SKIP_BIND=1 ASPIRE_ENABLE_APPROUTER=0 ASPIRE_ENABLE_PORTAL=0 aspire run --detach --format Json --non-interactive`
- `aspire ps --format Json --resources` to verify resource graph and custom commands
- `aspire stop --all || true` (best-effort stop in local validation)
- `bash scripts/aspire/cds-bind-run.sh auth --skip-bind -- npm run bind:list`
