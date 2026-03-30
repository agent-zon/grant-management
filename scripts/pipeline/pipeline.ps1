# =============================================================================
# Grant Management - Build, Push and Deploy Pipeline
# =============================================================================

param(
    [Alias("s")]
    [ValidateSet("srv", "sidecar", "approuter", "all")]
    [string]$Target = "all",
    [Alias("t")]
    [string]$Tag,
    [Alias("n")]
    [string]$Namespace,
    [Alias("d")]
    [string]$Domain,
    [switch]$NoCds,
    [switch]$NoDocker,
    [switch]$NoDeploy,
    [Alias("h")]
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-ErrorMsg { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Step { param([string]$Message) Write-Host "[STEP] $Message" -ForegroundColor Cyan }

function Show-Usage {
    Write-Host "Usage: ./scripts/pipeline/pipeline.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Target, -s TARGET         Service to build: srv, sidecar, approuter, all (default: all)"
    Write-Host "  -Tag, -t TAG               Image tag (default: <namespace>-latest)"
    Write-Host "  -Namespace, -n NAMESPACE   Kubernetes namespace (default: current kubectl context)"
    Write-Host "  -Domain, -d DOMAIN         Kyma cluster domain override"
    Write-Host "  -NoCds                     Skip CDS build, use existing gen/ output"
    Write-Host "  -NoDocker                  Skip Docker build and push"
    Write-Host "  -NoDeploy                  Skip Helm deploy and rollout restart"
    Write-Host "  -Help, -h                  Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./scripts/pipeline/pipeline.ps1"
    Write-Host "  ./scripts/pipeline/pipeline.ps1 -s srv"
    Write-Host "  ./scripts/pipeline/pipeline.ps1 -n grant-management"
    Write-Host "  ./scripts/pipeline/pipeline.ps1 -s sidecar -t v36"
    Write-Host "  ./scripts/pipeline/pipeline.ps1 -NoDocker -NoDeploy"
    Write-Host "  ./scripts/pipeline/pipeline.ps1 -NoCds -s approuter"
}

if ($Help) {
    Show-Usage
    exit 0
}

# Resolve namespace from kubectl context if not provided
if (-not $Namespace) {
    $Namespace = (kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}' 2>$null)
    if (-not $Namespace) { $Namespace = "default" }
}

# Resolve tag: default to {namespace}-latest
if (-not $Tag) {
    $Tag = "$Namespace-latest"
}

Write-Host "=============================================="
Write-Host "  Grant Management - Pipeline"
Write-Host "=============================================="
Write-Info "Target:       $Target"
Write-Info "Image Tag:    $Tag"
Write-Info "Namespace:    $(if ($Namespace) { $Namespace } else { '<current context>' })"
Write-Info "Domain:       $(if ($Domain) { $Domain } else { '<chart default>' })"
Write-Info "No CDS:       $NoCds"
Write-Info "No Docker:    $NoDocker"
Write-Info "No Deploy:    $NoDeploy"
Write-Host "=============================================="
Write-Host ""

$pipelineStart = Get-Date

# Step 1: CDS Build
if (-not $NoCds) {
    Write-Step "Step 1/3: CDS Production Build"
    Push-Location (Split-Path -Parent (Split-Path -Parent $ScriptDir))
    try {
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "CDS build failed" }
        Write-Success "CDS build completed"
    }
    catch {
        Write-ErrorMsg "CDS build failed: $_"
        exit 1
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Step "Step 1/3: CDS Build (skipped)"
}

Write-Host ""

# Step 2: Docker Build and Push
if (-not $NoDocker) {
    Write-Step "Step 2/3: Docker Build and Push"

    $buildParams = @{
        Target  = $Target
        Tag     = $Tag
        NoCds   = $true
    }

    if ($Namespace) {
        $buildParams.Namespace = $Namespace
    }

    try {
        & "$ScriptDir\build-and-push.ps1" @buildParams
        if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
        Write-Success "Docker build step completed"
    }
    catch {
        Write-ErrorMsg "Docker build step failed: $_"
        exit 1
    }
}
else {
    Write-Step "Step 2/3: Docker Build and Push (skipped)"
}

Write-Host ""

# Step 3: Deploy with Helm
if (-not $NoDeploy) {
    Write-Step "Step 3/3: Deploy with Helm"

    $deployParams = @{
        Target = $Target
        Tag    = $Tag
    }

    if ($Namespace) {
        $deployParams.Namespace = $Namespace
    }

    if ($Domain) {
        $deployParams.Domain = $Domain
    }

    try {
        & "$ScriptDir\deploy.ps1" @deployParams
        if ($LASTEXITCODE -ne 0) { throw "Deploy failed" }
        Write-Success "Deploy step completed"
    }
    catch {
        Write-ErrorMsg "Deploy step failed: $_"
        exit 1
    }
}
else {
    Write-Step "Step 3/3: Deploy (skipped)"
}

Write-Host ""

$pipelineEnd = Get-Date
$duration = ($pipelineEnd - $pipelineStart).TotalSeconds

Write-Host "=============================================="
Write-Host "  Pipeline Summary"
Write-Host "=============================================="
Write-Host "  Duration:  $([math]::Round($duration))s"
Write-Host "  Target:    $Target"
Write-Host "  Tag:       $Tag"
Write-Host "  Namespace: $Namespace"
Write-Host "=============================================="
Write-Host ""

Write-Success "Pipeline completed!"
