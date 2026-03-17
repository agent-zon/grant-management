# =============================================================================
# Grant Management - Build and Push Script
# =============================================================================

param(
    [Alias("s")]
    [ValidateSet("srv", "sidecar", "approuter", "all")]
    [string]$Target = "all",
    [Alias("t")]
    [string]$Tag,
    [string]$Registry = "scai-dev.common.repositories.cloud.sap",
    [string]$Namespace,
    [switch]$NoPush,
    [switch]$NoCds,
    [Alias("h")]
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-ErrorMsg { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Step { param([string]$Message) Write-Host "[STEP] $Message" -ForegroundColor Cyan }

function Show-Usage {
    Write-Host "Usage: ./scripts/pipeline/build-and-push.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Target, -s TARGET     Service to build: srv, sidecar, approuter, all (default: all)"
    Write-Host "  -Tag, -t TAG           Image tag (default: <namespace>-latest)"
    Write-Host "  -Registry REGISTRY     Container registry (default: scai-dev.common.repositories.cloud.sap)"
    Write-Host "  -Namespace NAMESPACE   Namespace for tag resolution (default: current kubectl context)"
    Write-Host "  -NoPush               Build only, skip docker push"
    Write-Host "  -NoCds               Skip CDS build, use existing gen/ output"
    Write-Host "  -Help, -h             Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./scripts/pipeline/build-and-push.ps1"
    Write-Host "  ./scripts/pipeline/build-and-push.ps1 -Target srv"
    Write-Host "  ./scripts/pipeline/build-and-push.ps1 -s sidecar -t v36"
    Write-Host "  ./scripts/pipeline/build-and-push.ps1 -s approuter -NoPush"
    Write-Host "  ./scripts/pipeline/build-and-push.ps1 -n grant-management -NoCds"
}

if ($Help) {
    Show-Usage
    exit 0
}

# Service definitions: target -> (Dockerfile, BuildContext, ImageRepo)
$Services = @{
    srv       = @{ Dockerfile = "Dockerfile";                BuildContext = ".";           ImageRepo = "grant-management/api" }
    sidecar   = @{ Dockerfile = "mtx/sidecar/Dockerfile";    BuildContext = ".";           ImageRepo = "grant-management/sidecar" }
    approuter = @{ Dockerfile = "app/router/Dockerfile";     BuildContext = "./app/router"; ImageRepo = "grant-management/approuter" }
}

# Resolve namespace from kubectl context if not provided
if (-not $Namespace) {
    $Namespace = (kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}' 2>$null)
    if (-not $Namespace) { $Namespace = "default" }
}

# Resolve tag
if (-not $Tag) {
    $Tag = "$Namespace-latest"
}

# Determine which targets to build
$targets = if ($Target -eq "all") { @("srv", "sidecar", "approuter") } else { @($Target) }

Push-Location $ProjectDir

try {
    # Check prerequisites
    foreach ($tool in @("docker", "kubectl")) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-ErrorMsg "Required tool '$tool' is not installed or not in PATH"
            exit 1
        }
    }

    Write-Host "=============================================="
    Write-Host "  Grant Management - Build and Push"
    Write-Host "=============================================="
    Write-Host ""
    Write-Info "Project Directory: $ProjectDir"
    Write-Info "Registry:          $Registry"
    Write-Info "Namespace:         $Namespace"
    Write-Info "Tag:               $Tag"
    Write-Info "Targets:           $($targets -join ', ')"
    Write-Info "No Push:           $NoPush"
    Write-Info "No CDS:            $NoCds"
    Write-Host ""

    # Step 1: CDS Build
    if (-not $NoCds) {
        Write-Step "Running CDS production build..."
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "CDS build failed"
            exit 1
        }
        Write-Success "CDS build completed"
        Write-Host ""
    } else {
        Write-Info "Skipping CDS build (NoCds flag set)"
    }

    # Step 2: Build and push each target
    $builtImages = @()

    foreach ($t in $targets) {
        $svc = $Services[$t]
        $dockerfile = $svc.Dockerfile
        $context = $svc.BuildContext
        $imageRepo = $svc.ImageRepo
        $fullImage = "$Registry/${imageRepo}:$Tag"

        Write-Step "Building $t -> $fullImage"

        if (-not (Test-Path $dockerfile)) {
            Write-ErrorMsg "Dockerfile not found: $dockerfile"
            exit 1
        }

        $buildArgs = @(
            "buildx", "build",
            "--platform", "linux/amd64",
            "-t", $fullImage,
            "-f", $dockerfile
        )

        if (-not $NoPush) {
            $buildArgs += "--push"
        }

        $buildArgs += $context

        Write-Info "Running: docker $($buildArgs -join ' ')"
        & docker @buildArgs
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Docker build failed for $t"
            exit 1
        }

        $builtImages += $fullImage
        Write-Success "$t image built successfully"
        Write-Host ""
    }

    # Summary
    Write-Host "=============================================="
    Write-Host "  Build Summary"
    Write-Host "=============================================="
    Write-Host "  Tag:       $Tag"
    Write-Host "  Namespace: $Namespace"
    foreach ($img in $builtImages) {
        Write-Host "  Image:     $img"
    }
    if ($NoPush) {
        Write-Warning "Images were NOT pushed (NoPush flag set)"
    }
    Write-Host "=============================================="
    Write-Success "Build pipeline completed"
}
finally {
    Pop-Location
}
