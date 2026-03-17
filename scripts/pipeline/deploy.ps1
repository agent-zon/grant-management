# =============================================================================
# Grant Management - Helm Deployment Script
# =============================================================================

param(
    [Alias("s")]
    [ValidateSet("srv", "sidecar", "approuter", "all")]
    [string]$Target = "all",
    [Alias("n")]
    [string]$Namespace,
    [Alias("r")]
    [string]$Release = "agents",
    [Alias("t")]
    [string]$Tag,
    [Alias("d")]
    [string]$Domain,
    [string]$ChartPath = "./gen/chart",
    [switch]$DryRun,
    [switch]$DebugMode,
    [switch]$Wait,
    [switch]$NoWait = $true,
    [string]$Timeout = "5m",
    [switch]$Rollback,
    [switch]$Uninstall,
    [switch]$Status,
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
    Write-Host "Usage: ./scripts/pipeline/deploy.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Namespace, -n NAMESPACE  Kubernetes namespace (default: current kubectl context)"
    Write-Host "  -Release, -r RELEASE      Helm release name (default: agents)"
    Write-Host "  -Tag, -t TAG              Image tag (default: <namespace>-latest)"
    Write-Host "  -Domain, -d DOMAIN        Kyma cluster domain override (global.domain)"
    Write-Host "  -ChartPath PATH           Helm chart path (default: ./gen/chart)"
    Write-Host "  -DryRun                   Perform a dry run without deploying"
    Write-Host "  -DebugMode                Enable Helm debug output"
    Write-Host "  -Wait                     Wait for deployment to complete"
    Write-Host "  -NoWait                   Don't wait for deployment (default)"
    Write-Host "  -Timeout TIMEOUT          Timeout for deployment (default: 5m)"
    Write-Host "  -Rollback                 Rollback to previous release"
    Write-Host "  -Uninstall                Uninstall the release"
    Write-Host "  -Status                   Show release status"
    Write-Host "  -Help, -h                 Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./scripts/pipeline/deploy.ps1"
    Write-Host "  ./scripts/pipeline/deploy.ps1 -n grant-management"
    Write-Host "  ./scripts/pipeline/deploy.ps1 -n grant-management -t v36"
    Write-Host "  ./scripts/pipeline/deploy.ps1 -Status"
    Write-Host "  ./scripts/pipeline/deploy.ps1 -Rollback"
}

if ($Help) {
    Show-Usage
    exit 0
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "kubectl is not installed or not in PATH"
        exit 1
    }

    if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "helm is not installed or not in PATH"
        exit 1
    }

    $null = kubectl cluster-info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Not connected to a Kubernetes cluster"
        exit 1
    }

    $resolvedChartPath = Join-Path $ProjectDir ($ChartPath -replace '^\.\/', '')
    if (-not (Test-Path $resolvedChartPath)) {
        Write-ErrorMsg "Helm chart directory not found at $resolvedChartPath"
        exit 1
    }

    Write-Success "Prerequisites check passed"
}

function Confirm-Namespace {
    if (-not $Namespace) {
        Write-Info "No namespace specified, using current context namespace"
        return
    }

    Write-Step "Ensuring namespace '$Namespace' exists..."

    $existingNs = kubectl get namespace $Namespace 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Creating namespace '$Namespace'..."
        kubectl create namespace $Namespace
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Failed to create namespace"
            exit 1
        }
        Write-Success "Namespace created"
    }
    else {
        Write-Info "Namespace '$Namespace' already exists"
    }
}

function Test-RegistrySecret {
    Write-Step "Checking registry secret..."

    $nsFlag = if ($Namespace) { @("-n", $Namespace) } else { @() }
    $secret = kubectl get secret docker-registry @nsFlag 2>&1
    if ($LASTEXITCODE -ne 0) {
        $nsMsg = if ($Namespace) { " in namespace '$Namespace'" } else { "" }
        Write-Warning "Registry secret 'docker-registry' not found$nsMsg"
        Write-Warning "Deployment may fail when pulling private images"
    }
    else {
        Write-Success "Registry secret found"
    }
}

function Invoke-RolloutRestart {
    $allDeployments = @("${Release}-srv", "${Release}-sidecar", "${Release}-approuter")
    $deployments = if ($Target -eq "all") {
        $allDeployments
    } else {
        @("${Release}-${Target}")
    }

    foreach ($deploymentName in $deployments) {
        $restartArgs = @("rollout", "restart", "deployment/$deploymentName")
        if ($Namespace) {
            $restartArgs += @("-n", $Namespace)
        }

        Write-Info "Running: kubectl $($restartArgs -join ' ')"
        & kubectl @restartArgs 2>&1 | Out-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Rollout restart triggered for '$deploymentName'"
        }
        else {
            Write-Warning "Rollout restart failed for '$deploymentName' (deployment may not exist)"
        }
    }
}

function Invoke-Deploy {
    Write-Step "Deploying Grant Management..."

    $chartAbsPath = Join-Path $ProjectDir ($ChartPath -replace '^\.\/', '')
    $helmArgs = @("upgrade", "--install", $Release, $chartAbsPath)

    if ($Namespace) {
        $helmArgs += @("--namespace", $Namespace)
    }

    $helmArgs += @("--set", "global.image.tag=$Tag")

    if ($Domain) {
        $helmArgs += @("--set", "global.domain=$Domain")
    }

    if ($DryRun) {
        $helmArgs += "--dry-run"
    }

    if ($DebugMode) {
        $helmArgs += "--debug"
    }

    if (-not $NoWait -or $Wait) {
        $helmArgs += @("--wait", "--timeout", $Timeout)
    }

    Write-Info "Running: helm $($helmArgs -join ' ')"
    Write-Host ""

    $ErrorActionPreference = "Continue"
    & helm @helmArgs 2>&1 | Out-Host
    $helmExitCode = $LASTEXITCODE
    $ErrorActionPreference = "Stop"

    if ($helmExitCode -ne 0) {
        Write-ErrorMsg "Deployment failed"
        exit 1
    }

    if (-not $DryRun) {
        Write-Success "Deployment completed successfully"

        Write-Step "Restarting deployments to pick up latest image..."
        Invoke-RolloutRestart
    }
    else {
        Write-Info "Dry run completed"
    }
}

function Invoke-Rollback {
    Write-Step "Rolling back to previous release..."

    $rollbackArgs = @("rollback", $Release)
    if ($Namespace) {
        $rollbackArgs += @("-n", $Namespace)
    }

    & helm @rollbackArgs
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Rollback failed"
        exit 1
    }

    Write-Success "Rollback completed successfully"
}

function Invoke-Uninstall {
    Write-Step "Uninstalling release '$Release'..."

    $uninstallArgs = @("uninstall", $Release)
    if ($Namespace) {
        $uninstallArgs += @("-n", $Namespace)
    }

    & helm @uninstallArgs
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Uninstall failed"
        exit 1
    }

    Write-Success "Uninstall completed successfully"
}

function Show-Status {
    Write-Step "Showing release status..."
    Write-Host ""

    $nsFlag = if ($Namespace) { @("-n", $Namespace) } else { @() }

    Write-Host "=== Helm Release Status ==="
    helm status $Release @nsFlag 2>&1 | Out-Host
    Write-Host ""

    Write-Host "=== Deployment Status ==="
    kubectl get deployment @nsFlag -l "app.kubernetes.io/instance=$Release" 2>&1 | Out-Host
    Write-Host ""

    Write-Host "=== Pod Status ==="
    kubectl get pods @nsFlag -l "app.kubernetes.io/instance=$Release" 2>&1 | Out-Host
    Write-Host ""

    Write-Host "=== Service Status ==="
    kubectl get svc @nsFlag -l "app.kubernetes.io/instance=$Release" 2>&1 | Out-Host
    Write-Host ""

    Write-Host "=== APIRule Status ==="
    kubectl get apirule @nsFlag -l "app.kubernetes.io/instance=$Release" 2>&1 | Out-Host
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
Write-Host "  Grant Management - Deployment"
Write-Host "=============================================="
Write-Host ""
Write-Info "Namespace:     $(if ($Namespace) { $Namespace } else { '<current context>' })"
Write-Info "Release Name:  $Release"
Write-Info "Chart Path:    $ChartPath"
Write-Info "Image Tag:     $Tag"
Write-Info "Domain:        $(if ($Domain) { $Domain } else { '<chart default>' })"
Write-Info "Wait:          $(-not $NoWait -or $Wait)"
Write-Info "Timeout:       $Timeout"
Write-Host ""

if ($Status) {
    Show-Status
}
elseif ($Rollback) {
    Test-Prerequisites
    Invoke-Rollback
}
elseif ($Uninstall) {
    Test-Prerequisites
    Invoke-Uninstall
}
else {
    Test-Prerequisites
    Confirm-Namespace
    Test-RegistrySecret
    Invoke-Deploy

    if (-not $DryRun) {
        Write-Host ""
        Write-Info "Deployment details:"
        Show-Status
    }
}

Write-Host ""
Write-Success "Done!"
