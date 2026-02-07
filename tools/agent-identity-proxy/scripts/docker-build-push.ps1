param(
  [Parameter(Mandatory=$false)]
  [string]$ContextPath,

    [Parameter(Mandatory=$false)]
    [string]$ImageRepository, # e.g. grant-management/api

    [string]$Registry = "scai-dev.common.repositories.cloud.sap",
    [string]$Tag = "latest",

    [switch]$UseBuildx,
    [string]$Platforms = "linux/amd64,linux/arm64",
    [switch]$NoPush,
    [switch]$UseChart,
    [string]$ChartValuesPath,

    [string[]]$BuildArgs = @(),
    [string]$Dockerfile = "Dockerfile"
)

# Defaults to allow running with no parameters
$scriptDir = Split-Path -Parent $PSCommandPath
$defaultContext = Split-Path -Parent $scriptDir
if (-not $PSBoundParameters.ContainsKey('ContextPath') -or [string]::IsNullOrWhiteSpace($ContextPath)) {
  $ContextPath = $defaultContext
}
if (-not $PSBoundParameters.ContainsKey('UseChart')) { $UseChart = $true }
if (-not $PSBoundParameters.ContainsKey('NoPush')) { $NoPush = $false }

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# Resolve paths
$ContextFullPath = Resolve-Path -LiteralPath $ContextPath -ErrorAction Stop
$DockerfilePath = Join-Path $ContextFullPath $Dockerfile

if (-not (Test-Path -LiteralPath $DockerfilePath)) {
  Write-Err "Dockerfile not found at $DockerfilePath"
  exit 1
}

# If requested, read image info from Helm chart values
if ($UseChart) {
  if (-not $ChartValuesPath) {
    $ChartValuesPath = Join-Path $ContextFullPath (Join-Path "chart" "values.yaml")
  }
  if (-not (Test-Path -LiteralPath $ChartValuesPath)) {
    Write-Err "Chart values file not found at $ChartValuesPath"
    exit 1
  }

  Write-Info "Reading image settings from: $ChartValuesPath"
  $rawYaml = Get-Content -LiteralPath $ChartValuesPath -Raw

  $yamlParsed = $null
  try {
    if (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue) {
      $yamlParsed = $rawYaml | ConvertFrom-Yaml
    }
  } catch {
    $yamlParsed = $null
  }

  if ($yamlParsed -ne $null) {
    $chartRegistry = $yamlParsed.global.image.registry
    $chartTag = $yamlParsed.global.image.tag
    $chartRepo = $yamlParsed.proxy.image.repository
  } else {
    # Fallback: simple regex extraction
    $chartRegistry = ($rawYaml -split "`r?`n" | ForEach-Object { $_.Trim() } | Select-String -Pattern '^registry:\s*(\S+)' -CaseSensitive).Matches.Value.Split(':')[-1].Trim()
    $chartTag = ($rawYaml -split "`r?`n" | ForEach-Object { $_.Trim() } | Select-String -Pattern '^tag:\s*(\S+)' -CaseSensitive).Matches.Value.Split(':')[-1].Trim()
    $chartRepo = ($rawYaml -split "`r?`n" | ForEach-Object { $_.Trim() } | Select-String -Pattern '^repository:\s*(\S+)' -CaseSensitive).Matches.Value.Split(':')[-1].Trim()
  }

  if ($chartRegistry) { $Registry = $chartRegistry }
  if ($chartTag) { $Tag = $chartTag }
  if ($chartRepo) { $ImageRepository = $chartRepo }

  Write-Info "Chart image: $Registry/${ImageRepository}:${Tag}"
}

if (-not $ImageRepository) {
  Write-Err "ImageRepository not provided and not found in chart. Provide -ImageRepository or use -UseChart."
  exit 1
}

# Compose full image name (use ${} to avoid scope parsing on ':')
$FullImage = "$Registry/${ImageRepository}:${Tag}"
Write-Info "Target image: $FullImage"

# Ensure Docker is available
$dockerVersion = (& docker --version) 2>$null
if (-not $dockerVersion) {
  Write-Err "Docker CLI not found. Please install Docker and ensure it's on PATH."
  exit 1
}
Write-Info "$dockerVersion"

# Prepare build-args
$buildArgsFlags = @()
foreach ($arg in $BuildArgs) {
  # Expecting args like Name=Value
  $buildArgsFlags += @("--build-arg", $arg)
}

# Build and push
if ($UseBuildx) {
  Write-Info "Using buildx for multi-platform build: $Platforms"
  # Ensure builder exists
  $builderName = "multi-platform-builder"
  (& docker buildx inspect $builderName) 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Info "Creating buildx builder '$builderName'"
    docker buildx create --name $builderName --use --bootstrap | Out-Null
  } else {
    Write-Info "Using existing buildx builder '$builderName'"
    docker buildx use $builderName | Out-Null
  }

  $cmd = @(
    "buildx", "build",
    "--platform", $Platforms,
    "-t", $FullImage,
    "-f", $DockerfilePath,
    $buildArgsFlags,
    $(if (-not $NoPush) { "--push" } else { "--load" }),
    $ContextFullPath
  ) | Where-Object { $_ -ne $null -and $_ -ne "" }

  Write-Info "Running: docker $($cmd -join ' ')"
  docker @cmd
  if ($LASTEXITCODE -ne 0) { Write-Err "Buildx build failed"; exit 1 }
  if ($NoPush) { Write-Info "NoPush enabled: image loaded locally: $FullImage" }
}
else {
  Write-Info "Running single-platform docker build"
  $cmdBuild = @(
    "build",
    "-t", $FullImage,
    "-f", $DockerfilePath,
    $buildArgsFlags,
    $ContextFullPath
  ) | Where-Object { $_ -ne $null -and $_ -ne "" }

  Write-Info "Running: docker $($cmdBuild -join ' ')"
  docker @cmdBuild
  if ($LASTEXITCODE -ne 0) { Write-Err "Docker build failed"; exit 1 }

  if (-not $NoPush) {
    Write-Info "Pushing: $FullImage"
    docker push $FullImage
    if ($LASTEXITCODE -ne 0) { Write-Err "Docker push failed"; exit 1 }
  } else {
    Write-Info "NoPush enabled: skipping docker push"
  }
}

Write-Host "✅ Done: $FullImage" -ForegroundColor Green
