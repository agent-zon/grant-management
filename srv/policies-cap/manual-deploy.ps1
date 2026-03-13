# Manual Deployment Script for CAP to Kubernetes
# This bypasses the ctz tool requirement

param(
    [string]$Registry = "docker.io/yourusername", # Change this to your registry
    [string]$Tag = "latest"
)

$APP_NAME = "policies-cap"
$IMAGE_NAME = "$Registry/$APP_NAME"
$FULL_IMAGE = "${IMAGE_NAME}:${Tag}"

Write-Host "🚀 Starting manual CAP Kubernetes deployment..." -ForegroundColor Green

# Step 1: Build the application
Write-Host "📦 Building CAP application..." -ForegroundColor Yellow
npx cds build --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CAP build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Build Docker image
Write-Host "🐳 Building Docker image..." -ForegroundColor Yellow
docker build -t $APP_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Tag for registry
Write-Host "🏷️  Tagging image for registry..." -ForegroundColor Yellow
docker tag $APP_NAME $FULL_IMAGE

# Step 4: Push to registry (commented out - uncomment when ready)
Write-Host "⬆️  Ready to push to registry..." -ForegroundColor Yellow
Write-Host "Run: docker push $FULL_IMAGE" -ForegroundColor Cyan

# Step 5: Deploy with Helm using generated chart
Write-Host "🎯 Deploying with Helm..." -ForegroundColor Yellow
helm upgrade --install $APP_NAME ./gen/chart `
    --set global.image.registry=$Registry `
    --set srv.image.repository=$APP_NAME `
    --set global.image.tag=$Tag `
    --namespace default `
    --create-namespace

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "📋 Check status with: kubectl get pods -l app.kubernetes.io/name=$APP_NAME" -ForegroundColor Cyan