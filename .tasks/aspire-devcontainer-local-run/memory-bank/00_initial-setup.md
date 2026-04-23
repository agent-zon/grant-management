# Aspire + Devcontainer Initial Setup

**Created**: 2026-04-23
**Last Updated**: 2026-04-23
**Category**: [SETUP] [DEVCONTAINER] [ASPIRE]
**Timeline**: 00 of 03 - Baseline and environment wiring

## Overview

Initial task setup for making local development and CI reproducible with:

- `ghcr.io/cds-zon/dev` devcontainer base image
- Aspire TypeScript AppHost initialization
- CDS bind wrappers for K8s-backed hybrid auth/destination dependencies

## Key findings

1. Repo already had most `cds bind` scripts, but lacked a working `bind:all` script referenced by `setup:local`.
2. Existing approuter startup required IAS by default, which blocks fully local mode. A local xs-app config variant is needed for machine-independent Aspire runs.
3. Aspire CLI was not preinstalled; installed via official installer and initialized with `aspire init --language typescript`.

## Artifacts created

- `.devcontainer/post-create.sh`
- `scripts/aspire/cds-bind-run.sh`
- `app/router/xs-app.local.json`
- `apphost.ts` orchestrating CDS + approuter (+ optional portal)
- `AGENTS.md`
- `docs/LOCAL_ASPIRE.md`
- `.github/workflows/aspire-run.yml`

## Next links

- Next: `01_implementation-details.md`
