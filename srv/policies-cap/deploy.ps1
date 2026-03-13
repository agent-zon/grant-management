# Deployment script for policies-cap application
# Replace YOUR_REGISTRY with your actual container registry

$REGISTRY = "your-registry.com" # Replace with your actual registry (e.g., myregistry.azurecr.io, docker.io/yourusername)
$IMAGE_NAME = "policies-cap"
$VERSION = "latest"
$FULL_IMAGE = "${REGISTRY}/${IMAGE_NAME}:${VERSION}"

Write-Host "🚀 Starting deployment process..." -ForegroundColor Green

# Step 1: Build Docker image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:${VERSION}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Tag for registry
Write-Host "🏷️  Tagging image for registry..." -ForegroundColor Yellow
docker tag "${IMAGE_NAME}:${VERSION}" $FULL_IMAGE

# Step 3: Push to registry
Write-Host "⬆️  Pushing to container registry..." -ForegroundColor Yellow
Write-Host "Note: Make sure you are logged in to your registry first!" -ForegroundColor Cyan
Write-Host "For Docker Hub: docker login" -ForegroundColor Cyan
Write-Host "For Azure CR: az acr login --name yourregistry" -ForegroundColor Cyan

# Uncomment the next line when ready to push
# docker push $FULL_IMAGE

# Step 4: Deploy with Helm
Write-Host "🎯 Ready to deploy with Helm..." -ForegroundColor Yellow
Write-Host "Run the following command when your image is pushed:" -ForegroundColor Cyan
Write-Host "helm upgrade --install policies-cap ./helm --set image.repository=$REGISTRY/$IMAGE_NAME --set image.tag=$VERSION --namespace default --create-namespace" -ForegroundColor White

Write-Host "✅ Build complete! Push to registry and run Helm command above." -ForegroundColor Green
Write-Host "📋 After deployment, check status with: kubectl get pods -l app.kubernetes.io/name=policies-cap" -ForegroundColor Cyan