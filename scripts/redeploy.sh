#!/bin/bash
# Quick redeploy script for fixing Tailwind CSS issues

set -e


NAMESPACE=${1:-"grants"}
# Build and push Docker image
echo "🔧 Building the application.."

current_dir=$(pwd)
cd ./deno && deno task build 
cd $current_dir

echo "🐳 Building and pushing Docker image..."
./scripts/docker-build-push.sh scai-dev.common.repositories.cloud.sap grant-management latest

echo "🚀 Deploying to Kubernetes $NAMESPACE namespace... "
kubectl apply -f k8s-deployment.yaml -n $NAMESPACE


# kubectl rollout restart deployment grant-management -n grants

echo "🔍 Deleting pods..."
echo "$(kubectl delete pods  -l app=grant-management -n $NAMESPACE)"

echo "🔍 Viewing logs..."
sleep 10
echo "$(kubectl get pods -n $NAMESPACE)"
sleep 10
echo "$(kubectl logs -l app=grant-management -n $NAMESPACE)"
sleep 10
echo "$(kubectl get pods -n $NAMESPACE)"
echo "✅ Deployment completed!"
echo "🌐 Application should be available at: https://grant-management-dashboard.c-127c9ef.stage.kyma.ondemand.com/"
echo "⏳ Please wait a few minutes for the deployment to complete and the new image to be pulled."
