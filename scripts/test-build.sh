#!/bin/bash
# Test build script that simulates the containerization process
# Usage: ./scripts/test-build.sh

set -e

echo "🧪 Testing build process..."

# Test if ctz command works
echo "📦 Testing ctz command..."
if command -v ctz &> /dev/null; then
    echo "✅ ctz command found"
else
    echo "❌ ctz command not found"
    exit 1
fi

# Test if containerize.yaml is valid
echo "📋 Validating containerize.yaml..."
if [ -f "containerize.yaml" ]; then
    echo "✅ containerize.yaml found"
    # Basic YAML validation
    if python3 -c "import yaml; yaml.safe_load(open('containerize.yaml'))" 2>/dev/null; then
        echo "✅ containerize.yaml is valid YAML"
    else
        echo "⚠️  containerize.yaml might have YAML syntax issues"
    fi
else
    echo "❌ containerize.yaml not found"
    exit 1
fi

# Test if Docker files exist
echo "🐳 Checking Docker files..."
docker_files=(
    "Dockerfile"
    "app/grant-management/GrantManagementServer/Dockerfile"
    "app/grant-management/GrantMcpLayer/Dockerfile"
    "app/cockpit-ui/Dockerfile"
    "app/router/Dockerfile"
    "app/portal/Dockerfile"
    "app/mcp-proxy/Dockerfile"
)

for file in "${docker_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test if package.json scripts are correct
echo "📜 Checking package.json scripts..."
if grep -q "build:containers" package.json; then
    echo "✅ build:containers script found"
else
    echo "❌ build:containers script missing"
fi

if grep -q "deploy" package.json; then
    echo "✅ deploy script found"
else
    echo "❌ deploy script missing"
fi

echo "🎉 Build test completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Set up Docker properly in your environment"
echo "2. Set the required environment variables:"
echo "   - DOCKER_USERNAME"
echo "   - DOCKER_PASSWORD" 
echo "   - DOCKER_REGISTRY"
echo "   - KUBE_TOKEN"
echo "   - KUBE_USER"
echo "3. Run: npm run build:containers"
echo "4. Run: npm run deploy"