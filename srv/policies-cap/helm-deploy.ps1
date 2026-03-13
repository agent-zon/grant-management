# Deploy Policies CAP using Helm

# Configuration
$REGISTRY = "scai-dev.common.repositories.cloud.sap"
$REPOSITORY = "policies-cap/policies-cap"
$TAG = if ($args[0]) { $args[0] } else { "latest" }
$IMAGE_NAME = "${REGISTRY}/${REPOSITORY}:${TAG}"
$RELEASE_NAME = "policies-cap"

Write-Host "=== Deploying Policies CAP with Helm ===" -ForegroundColor Green
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Yellow
Write-Host "Release: $RELEASE_NAME" -ForegroundColor Yellow
Write-Host "Using current namespace: $(kubectl config view --minify --output 'jsonpath={..namespace}')" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build CAP application
Write-Host "1. Building CAP application..." -ForegroundColor Cyan
npx cds build --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CAP build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Build Docker image
Write-Host "2. Building Docker image..." -ForegroundColor Cyan
docker build -t $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Push to registry
Write-Host "3. Pushing to registry..." -ForegroundColor Cyan
docker push $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy with Helm
Write-Host "4. Deploying with Helm..." -ForegroundColor Cyan
helm upgrade --install $RELEASE_NAME ./gen/chart `
  --set global.image.tag=$TAG `
  --set global.image.registry=$REGISTRY `
  --set srv.image.repository="policies-cap" `
  --set web-application.enabled=false `
  --wait `
  --timeout=300s

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Helm deployment failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Show deployment status
Write-Host "5. Deployment status:" -ForegroundColor Cyan
kubectl get pods -l app.kubernetes.io/name=policies-cap
kubectl get svc -l app.kubernetes.io/name=policies-cap

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Service URL: https://policies-cap-srv-c-127c9ef.stage.kyma.ondemand.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "kubectl logs -l app.kubernetes.io/name=policies-cap -f" -ForegroundColor White