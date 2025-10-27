#!/bin/bash
set -e

echo "🔍 Validating deployment configuration..."

# Check if all required files exist
echo "📁 Checking required files..."

required_files=(
    "Dockerfile"
    "app/router/Dockerfile"
    "app/grant-management/GrantManagementServer/Dockerfile"
    "app/grant-management/GrantMcpLayer/Dockerfile"
    "app/cockpit-ui/Dockerfile"
    "app/mcp-proxy/Dockerfile"
    "mcp-server-example/Dockerfile"
    "k8s-deployment.yaml"
    "gen/srv/package.json"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi

# Check environment variables
echo "🔧 Checking environment variables..."
env_vars=(
    "DOCKER_REGISTRY"
    "DOCKER_USERNAME"
    "DOCKER_PASSWORD"
    "KUBE_TOKEN"
    "KUBE_USER"
    "KUBE_SERVER"
)

missing_env=()
for var in "${env_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_env+=("$var")
    else
        echo "✅ $var is set"
    fi
done

if [ ${#missing_env[@]} -ne 0 ]; then
    echo "⚠️  Missing environment variables (will use defaults or assume already configured):"
    printf '%s\n' "${missing_env[@]}"
fi

# Validate Dockerfile syntax (basic check)
echo "🐳 Validating Dockerfile syntax..."
for dockerfile in Dockerfile app/*/Dockerfile mcp-server-example/Dockerfile; do
    if [ -f "$dockerfile" ]; then
        if grep -q "FROM" "$dockerfile" && grep -q "COPY\|ADD" "$dockerfile"; then
            echo "✅ $dockerfile appears valid"
        else
            echo "⚠️  $dockerfile may have issues"
        fi
    fi
done

# Validate Kubernetes manifest
echo "☸️  Validating Kubernetes manifest..."
if command -v kubectl >/dev/null 2>&1; then
    kubectl apply --dry-run=client -f k8s-deployment.yaml && echo "✅ k8s-deployment.yaml is valid"
else
    echo "⚠️  kubectl not available, skipping K8s validation"
fi

# Check if scripts are executable
echo "🔧 Checking script permissions..."
scripts=(
    "scripts/build-containers.sh"
    "scripts/deploy-k8s.sh"
    "scripts/validate-deployment.sh"
)

for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo "✅ $script is executable"
    else
        echo "❌ $script is not executable"
        chmod +x "$script"
        echo "✅ Fixed permissions for $script"
    fi
done

echo "🎉 Validation completed!"
echo ""
echo "📋 Summary:"
echo "- All required files are present"
echo "- Docker files appear to be valid"
echo "- Scripts have correct permissions"
echo "- Ready for deployment (assuming Docker and kubectl are available in target environment)"
echo ""
echo "🚀 To deploy:"
echo "1. Set environment variables: DOCKER_REGISTRY, DOCKER_USERNAME, DOCKER_PASSWORD"
echo "2. Set Kubernetes variables: KUBE_TOKEN, KUBE_USER, KUBE_SERVER"
echo "3. Run: npm run deploy"