# Aspire + Local Runtime Implementation Details

**Created**: 2026-04-23
**Last Updated**: 2026-04-23
**Category**: [IMPLEMENTATION] [ASPIRE] [BINDING]
**Timeline**: 01 of 04 - AppHost and local/hybrid runtime integration

## Overview

This phase implemented the operational pieces needed so a developer can run the
stack either:

- fully local (`ASPIRE_LOCAL_ONLY=1 SKIP_BIND=1 aspire run`)
- or hybrid with K8s service bindings (`aspire run` + `KUBECONFIG`)

## AppHost orchestration

`apphost.ts` now models and wires:

- `cds` (root package scripts)
- `approuter` (`app/router`)
- optional `portal` (`app/portal`) via `ASPIRE_ENABLE_PORTAL=1`

Dependency order:

- `approuter.waitFor(cds)`
- optional `portal.waitFor(cds)` and `approuter.withReference(portal, { optional: true })`

## Custom commands added in Aspire dashboard

On the `cds` resource:

- `bind-auth`
- `bind-destination`
- `bind-all`
- `bind-github`
- `bind-router`

These commands execute `scripts/aspire/cds-bind-run.sh` so users can trigger
binding actions without leaving the dashboard context.

## Local-friendly AppRouter mode

To avoid hard IAS dependency in local-only workflows:

- Added `app/router/xs-app.local.json` with `authenticationType: "none"`.
- Updated `app/router/custom-server.js` to accept `XSAPP_CONFIG`.
- Added npm script `serve:approuter:local`.

## Supporting scripts

- Added `serve:cds:hybrid` script.
- Added `serve:cds:local` script (uses mocked auth override for local mode).
- Added missing `bind:all` script.
- Added executable helper `scripts/aspire/cds-bind-run.sh` with profile and
  kubeconfig support.

## CI compatibility adjustments

- Added `ASPIRE_ENABLE_APPROUTER` gating in `apphost.ts` so CI can run a
  stable local-only smoke job without requiring IAS-bound approuter startup.
- Configured workflow to run `aspire run --detach --format Json`, inspect
  resources with `aspire ps --resources`, then perform best-effort shutdown.

## Previous / Next

- Previous: `00_initial-setup.md`
- Next: `02_validation-and-ci.md`
