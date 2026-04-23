# Aspire + Local Runtime Validation & CI Notes

**Created**: 2026-04-23
**Last Updated**: 2026-04-23
**Category**: [VALIDATION] [CI]
**Timeline**: 02 of 03 - Validation outcomes and CI alignment

## Overview

Validation focused on whether the repository can be started deterministically
with Aspire in local mode, and whether CI can execute the same flow in a
containerized environment.

## Validation commands executed

1. `npm run aspire:build`
2. `npm run serve:cds:local`
3. `npm run serve:approuter:local`
4. `ASPIRE_LOCAL_ONLY=1 SKIP_BIND=1 ASPIRE_ENABLE_APPROUTER=0 ASPIRE_ENABLE_PORTAL=0 aspire run --detach --format Json`
5. `aspire ps --format Json --resources`

## Key findings

- `serve:cds` required IAS bindings by default; local smoke succeeded with
  explicit `cds_requires_auth_kind=mocked` (`serve:cds:local`).
- `serve:approuter:local` required passing full `xsappConfig` object to
  `@sap/approuter` start options (not path string); fixed by loading and parsing
  JSON file in `custom-server.js`.
- Detached `aspire run` initially failed due to endpoint proxy settings; solved
  using `withHttpEndpoint({ port: ..., isProxied: false })` for JavaScript
  resources.
- In this environment, `aspire stop --all` may report failure even when
  apphost process has stopped (`aspire ps` returns empty); CI treats stop as
  best-effort and verifies with `aspire ps`.

## CI workflow alignment

Workflow added:

- `.github/workflows/aspire-run.yml`

Behavior:

- Runs in container image `ghcr.io/cds-zon/dev`
- Installs dependencies and Aspire CLI
- Builds apphost TypeScript
- Runs local-only detached Aspire (`ASPIRE_LOCAL_ONLY=1`, `SKIP_BIND=1`)
- Prints resource state (`aspire ps --resources`)
- Attempts stop (`aspire stop --all || true`) and confirms terminal state

## Previous / Next

- Previous: `01_implementation-details.md`
- Next: `99_task-completion-summary.md`
