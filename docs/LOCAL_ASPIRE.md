# Local development with Aspire + CDS bind

**Created**: 2026-04-23  
**Last Updated**: 2026-04-23  
**Category**: [RUNBOOK] [ASPIRE] [CDS-BIND]

Use this guide to run the project consistently on any machine with one command:

```bash
aspire run
```

## Prerequisites

- Node.js 22+
- npm
- Docker running (for devcontainer and Aspire dependencies)
- Aspire CLI installed (`aspire --version`)
- Optional for remote bindings: `kubectl` + reachable cluster + `KUBECONFIG`

## 1) Install dependencies

```bash
npm install
npm install -w app/router
npm install -w app/portal
```

## 2) Choose local mode

### Local-only mode (no IAS / no k8s bindings)

This mode is best for development and CI smoke checks:

```bash
export ASPIRE_LOCAL_ONLY=1
export SKIP_BIND=1
aspire run
```

What this does:
- CDS starts with `npm run serve:cds:local` on port `4004`
- Approuter starts with `npm run serve:approuter:local` on port `9000`
- Local approuter config is `app/router/xs-app.local.json` with `authenticationType: none`

### Hybrid mode (bind IAS/destination/github from Kubernetes)

Use this mode when you need real IAS + destination behavior:

```bash
export KUBECONFIG=/absolute/path/to/your/kubeconfig
export ASPIRE_LOCAL_ONLY=0
aspire run
```

You can invoke service binding via:
- Aspire dashboard commands on the `cds` resource:
  - `bind-auth`
  - `bind-destination`
  - `bind-all`
- Or manually:

```bash
bash scripts/aspire/cds-bind-run.sh all --profile hybrid -- npm run bind:resolve
```

## 3) Key environment variables

- `ASPIRE_LOCAL_ONLY=1`  
  Force local, no-IAS app router route config.
- `SKIP_BIND=1`  
  Skip `cds bind` execution in wrapper scripts.
- `KUBECONFIG=/path/to/config`  
  Context used by `cds bind --on k8s`.
- `CDS_PROFILE`  
  Defaults to `hybrid` unless local-only mode is active.
- `ASPIRE_ENABLE_PORTAL=1`  
  Include `app/portal` resource in AppHost run.

## 4) Useful scripts

- `npm run serve:cds`  
  Local CDS serve (`--profile dev`)
- `npm run serve:cds:local`  
  Local CDS serve with explicit mocked auth override
- `npm run serve:cds:hybrid`  
  Hybrid CDS serve via `cds bind`
- `npm run serve:approuter`  
  IAS-enabled app router
- `npm run serve:approuter:local`  
  Local non-IAS app router (`xs-app.local.json`)
- `npm run bind:all`  
  Bind all required services on k8s
- `npm run bind:list`  
  Show existing bindings from `.cdsrc-private.json` (human-readable)

## 5) Testing

Local smoke:

```bash
npm test
```

Hybrid auth flow tests:

```bash
npm run test:oauth
npm run test:grant-mgmt
npm run test:mcp-service
```

## 6) Notes on CDS bind + k8s

The project follows CAP hybrid testing semantics:
- K8s service bindings are read and materialized into CDS config via `cds bind`.
- Runtime services can consume credentials from `cds.requires.*.credentials`.
- `KUBECONFIG` controls cluster context for all `--on k8s` bind operations.
- CAP Kubernetes binding resolution and credential mapping behavior follows
  the documented `cds bind` / `cds.requires.*.credentials` model from CAP docs.

See also:
- `scripts/aspire/cds-bind-run.sh`
- `scripts/sa/install-kubectl-and-login.sh`
- `README.md` hybrid section
