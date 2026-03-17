# Grant Management Pipeline

This folder contains the PowerShell pipeline used to build, package, and deploy Grant Management workloads to Kubernetes/Kyma.

## Main Entry Point

- `./scripts/pipeline/pipeline.ps1`

The pipeline orchestrates 3 stages:

1. CDS production build (`npm run build`)
2. Docker build and push (`build-and-push.ps1`)
3. Helm deployment (`deploy.ps1`)

## Quick Start

From repository root:

```powershell
# Full pipeline (srv + sidecar + approuter)
./scripts/pipeline/pipeline.ps1

# Single target
./scripts/pipeline/pipeline.ps1 -Target sidecar

# Use an explicit namespace and tag
./scripts/pipeline/pipeline.ps1 -Namespace grant-management -Tag v36

# Skip docker and deploy (build-only check)
./scripts/pipeline/pipeline.ps1 -NoDocker -NoDeploy

# Skip CDS rebuild, then build/push + deploy
./scripts/pipeline/pipeline.ps1 -NoCds -Target approuter
```

NPM shortcuts are also available:

```powershell
npm run pipeline
npm run pipeline:srv
npm run pipeline:sidecar
npm run pipeline:approuter
```

## Pipeline Parameters (`pipeline.ps1`)

- `-Target, -s`: `srv`, `sidecar`, `approuter`, or `all` (default: `all`)
- `-Tag, -t`: image tag (default: `<namespace>-latest`)
- `-Namespace, -n`: Kubernetes namespace (default: namespace from current kubectl context, fallback `default`)
- `-Domain, -d`: optional Kyma domain override passed to Helm (`global.domain`)
- `-NoCds`: skip CDS build
- `-NoDocker`: skip Docker build and push stage
- `-NoDeploy`: skip Helm deploy stage
- `-Help, -h`: show usage

## Stage Details

### Stage 1: CDS Build

- Command: `npm run build`
- Script behind it: `npx cds build --production`
- Output used by later stages: `gen/` artifacts (including Helm chart at `gen/chart`)

### Stage 2: Docker Build and Push (`build-and-push.ps1`)

Build targets and image repositories:

- `srv` -> `grant-management/api`
- `sidecar` -> `grant-management/sidecar`
- `approuter` -> `grant-management/approuter`

Default registry:

- `scai-dev.common.repositories.cloud.sap`

The build uses `docker buildx build --platform linux/amd64` and pushes by default.

### Stage 3: Helm Deploy (`deploy.ps1`)

- Chart path default: `./gen/chart`
- Release default: `agents`
- Image tag passed via `--set global.image.tag=<tag>`
- Optional domain override via `--set global.domain=<domain>`
- After successful deploy, script triggers rollout restart for:
  - `agents-srv`
  - `agents-sidecar`
  - `agents-approuter`
  (or only the selected target deployment)

## Prerequisites

Install and configure:

- PowerShell (`pwsh`)
- Node.js + npm
- Docker with buildx enabled
- `kubectl` configured to your target cluster/context
- `helm`
- Access to container registry `scai-dev.common.repositories.cloud.sap`

Recommended checks:

```powershell
kubectl config current-context
kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}'
helm version
docker --version
```

## Common Workflows

### Full deployment to current namespace

```powershell
./scripts/pipeline/pipeline.ps1
```

### Deploy only `srv`

```powershell
./scripts/pipeline/pipeline.ps1 -Target srv
```

### Re-deploy using existing `gen/` output

```powershell
./scripts/pipeline/pipeline.ps1 -NoCds
```

### Build and push only (no deploy)

```powershell
./scripts/pipeline/pipeline.ps1 -NoDeploy
```

### Deploy only (use existing images)

```powershell
./scripts/pipeline/pipeline.ps1 -NoCds -NoDocker
```

## Troubleshooting

### CDS build fails

- Re-run: `npm run build`
- Verify CAP project builds before pipeline run.

### Docker build/push fails

- Ensure Docker is running.
- Validate registry access and credentials.
- Test direct target build:

```powershell
./scripts/pipeline/build-and-push.ps1 -Target sidecar -NoCds
```

### Helm deploy fails

- Verify chart exists at `gen/chart`.
- Check cluster access: `kubectl cluster-info`
- Check release state:

```powershell
./scripts/pipeline/deploy.ps1 -Status
```

- Rollback if needed:

```powershell
./scripts/pipeline/deploy.ps1 -Rollback
```

### Wrong tag or namespace used

- Remember defaults come from current kubectl context.
- Use explicit flags when in doubt:

```powershell
./scripts/pipeline/pipeline.ps1 -Namespace <ns> -Tag <tag>
```

## Related Scripts

- `./scripts/pipeline/build-and-push.ps1`: build and push images
- `./scripts/pipeline/deploy.ps1`: deploy/rollback/status via Helm
