# Deploy Policies CAP using simple Kubernetes manifests (no APIRule issues)

# Configuration
$REGISTRY = "scai-dev.common.repositories.cloud.sap"
$REPOSITORY = "policies-cap/policies-cap"
$TAG = if ($args[0]) { $args[0] } else { "latest" }
$IMAGE_NAME = "${REGISTRY}/${REPOSITORY}:${TAG}"
$RELEASE_NAME = "policies-cap"
$NAMESPACE = "tomer-dev"

Write-Host "=== Deploying Policies CAP with Kubernetes Manifests ===" -ForegroundColor Green
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Yellow
Write-Host "Release: $RELEASE_NAME" -ForegroundColor Yellow
Write-Host "Namespace: $NAMESPACE" -ForegroundColor Yellow
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
docker build --no-cache -t $IMAGE_NAME .

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

# Step 4: Deploy with kubectl
Write-Host "4. Deploying with kubectl..." -ForegroundColor Cyan
kubectl apply -f k8s-simple.yaml -n $NAMESPACE
kubectl apply -f virtualservice.yaml -n $NAMESPACE

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Kubernetes apply failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Update image
Write-Host "5. Updating deployment image..." -ForegroundColor Cyan
kubectl set image deployment/policies-cap policies-cap=$IMAGE_NAME -n $NAMESPACE

# Step 5.5: Restart deployment to ensure new image is used
Write-Host "5.5. Restarting deployment..." -ForegroundColor Cyan
kubectl rollout restart deployment/policies-cap -n $NAMESPACE

# Step 6: Wait for rollout
Write-Host "6. Waiting for deployment..." -ForegroundColor Cyan
kubectl rollout status deployment/policies-cap -n $NAMESPACE --timeout=300s

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment rollout failed!" -ForegroundColor Red
    exit 1
}

# Step 7: Show deployment status
Write-Host "7. Deployment status:" -ForegroundColor Cyan
kubectl get pods -l app=policies-cap -n $NAMESPACE
kubectl get svc -l app=policies-cap -n $NAMESPACE
kubectl get virtualservice policies-cap -n $NAMESPACE

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Service URL: https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com" -ForegroundColor Yellow
Write-Host "Policies API: https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/policies" -ForegroundColor Yellow
Write-Host "Frontend UI: https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/app" -ForegroundColor Yellow
Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "kubectl logs -l app=policies-cap -f -n $NAMESPACE" -ForegroundColor White