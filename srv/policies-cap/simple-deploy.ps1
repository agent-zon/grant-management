# Simple CAP K8s deployment without containerize tool
param(
    [string]$Registry = "docker.io/policies-cap",
    [string]$Tag = "latest"
)

Write-Host "🚀 Deploying CAP to Kubernetes (manual approach)..." -ForegroundColor Green

# Step 1: Build CAP project
Write-Host "📦 Building CAP project..." -ForegroundColor Yellow
npx cds build --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CAP build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Build Docker image from gen folder
Write-Host "🐳 Building Docker image..." -ForegroundColor Yellow
docker build -t policies-cap:$Tag ./gen/srv

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Tag for registry
$FULL_IMAGE = "$Registry/policies-cap:$Tag"
Write-Host "🏷️  Tagging image: $FULL_IMAGE" -ForegroundColor Yellow
docker tag policies-cap:$Tag $FULL_IMAGE

Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "📤 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Push image: docker push $FULL_IMAGE" -ForegroundColor White
Write-Host "   2. Deploy: helm install policies-cap ./gen/chart --set global.image.registry=$Registry --set srv.image.repository=policies-cap --set global.image.tag=$Tag" -ForegroundColor White
Write-Host "   3. Check: kubectl get pods" -ForegroundColor White