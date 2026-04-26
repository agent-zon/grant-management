# Agent Runbook

**Created**: 2026-04-23  
**Last Updated**: 2026-04-23  
**Category**: [OPERATIONS]

## Purpose

This file is for humans and cloud/CI agents that need to run the project quickly and consistently.

## Components

- **CDS service (`srv/`)**  
  Main CAP backend with OAuth, grant management, policy APIs, and service integration.
- **Approuter (`app/router/`)**  
  Route gateway for backend/portal, supports IAS profile and local no-auth profile.
- **Portal (`app/portal/`)**  
  React Router UI for dashboards and governance views.
- **Aspire AppHost (`apphost.ts`)**  
  Orchestration graph that runs local resources and exposes dashboard controls.
- **Bind wrapper (`scripts/aspire/cds-bind-run.sh`)**  
  Uniform wrapper for `cds bind ... --on k8s` and local command execution.

## Run Modes

### 1) Fully local (no IAS requirement)

Use this mode on any machine first.

```bash
npm install
export ASPIRE_LOCAL_ONLY=1
export SKIP_BIND=1
aspire run
```

What this does:
- Runs CDS with `serve:cds` (dev profile)
- Runs approuter with `serve:approuter:local` (`xs-app.local.json`, no IAS auth)
- Keeps flow reproducible without cloud bindings

### 2) Hybrid local + K8s service bindings (IAS/destination)

Use this mode when you have cluster access and want realistic auth/bind behavior.

```bash
# Optional helper to prepare kubeconfig from env
./scripts/sa/install-kubectl-and-login.sh

# Explicit kubeconfig (recommended for agents/CI)
export KUBECONFIG=/workspace/.kube-remote-config

# Hybrid run through Aspire
unset ASPIRE_LOCAL_ONLY
unset SKIP_BIND
aspire run
```

In Aspire dashboard:
- Use **cds → bind-auth** to bind IAS only
- Use **cds → bind-destination** to bind destination only
- Use **cds → bind-all** to bind auth/destination/github/srv/router

### 3) Direct npm scripts (without Aspire)

```bash
npm run serve:cds
npm run serve:approuter:local
```

Hybrid script:

```bash
npm run serve:cds:hybrid
npm run serve:approuter
```

## Key Environment Variables

- `ASPIRE_LOCAL_ONLY=1`  
  Forces local-only scripts in `apphost.ts` (no hybrid bind expectation).
- `SKIP_BIND=1`  
  Prevents bind wrapper from running `cds bind` (useful in local mode and CI smoke runs).
- `KUBECONFIG=/path/to/kubeconfig`  
  Used by `cds bind --on k8s`.
- `ASPIRE_ENABLE_PORTAL=1`  
  Starts portal resource in Aspire graph.
- `CDS_PROFILE`  
  Override CDS profile selected by AppHost.

## Test Commands

Core:

```bash
npm test
```

Hybrid-sensitive tests:

```bash
npm run test:oauth
npm run test:grant-mgmt
npm run test:mcp-service
```

Approuter + UI e2e:

```bash
npm run test:e2e:policies
```

## CI expectations

The default workflow (`.github/workflows/aspire-run.yml`) runs in the
`ghcr.io/cds-zon/dev` container and executes local-only Aspire smoke checks:

- `ASPIRE_LOCAL_ONLY=1`
- `SKIP_BIND=1`

This keeps CI deterministic on any runner while still validating AppHost
orchestration and process boot behavior.

## Operational Notes

- `cds bind` persists entries in `.cdsrc-private.json` and should not be committed.
- For CAP-on-K8s binding behavior, prefer explicit `KUBECONFIG` in automation.
- Use `aspire stop --all` to clean stale local AppHosts during iterative runs.
