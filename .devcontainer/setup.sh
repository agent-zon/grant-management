#!/bin/bash

# OAuth 2.0 Grant Management API - Dev Container Setup Helper
set -e

echo "🚀 OAuth 2.0 Grant Management API - Dev Container Setup"
echo "=================================================="

# Check if we're in a dev container
if [ -n "$REMOTE_CONTAINERS" ] || [ -n "$CODESPACES" ]; then
    echo "✅ Running in dev container environment"
else
    echo "⚠️  Not running in dev container - some features may not work"
fi

# Check required tools
echo ""
echo "🔍 Checking required tools..."

check_tool() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 is installed"
    else
        echo "❌ $1 is not installed"
        return 1
    fi
}

check_tool "node" || echo "Node.js version: $(node --version)"
check_tool "npm" || echo "npm version: $(npm --version)"
check_tool "deno" || echo "Deno version: $(deno --version)"
check_tool "cds" || echo "CDS version: $(cds --version)"
check_tool "docker" || echo "Docker version: $(docker --version)"
check_tool "kubectl" || echo "kubectl version: $(kubectl version --client --short)"
check_tool "helm" || echo "Helm version: $(helm version --short)"
check_tool "git" || echo "Git version: $(git --version)"

# Check project structure
echo ""
echo "📁 Checking project structure..."

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 is missing"
        return 1
    fi
}

check_file "package.json"
check_file "cds.json"
check_file "srv/deno.jsonc"
check_file "db/schema.cds"
check_file "srv/grant-management-service.cds"

# Check database
echo ""
echo "🗄️ Checking database..."

if [ -f "db.sqlite" ]; then
    echo "✅ Database file exists"
    echo "📊 Database tables:"
    sqlite3 db.sqlite ".tables" 2>/dev/null || echo "   (Database may be empty)"
else
    echo "⚠️  Database file not found - run 'db-reset' to create it"
fi

# Check ports
echo ""
echo "🌐 Checking available ports..."

check_port() {
    if netstat -tuln 2>/dev/null | grep -q ":$1 "; then
        echo "⚠️  Port $1 is in use"
    else
        echo "✅ Port $1 is available"
    fi
}

check_port 3000
check_port 4004
check_port 5173
check_port 8080

# Show quick start commands
echo ""
echo "🚀 Quick Start Commands:"
echo "========================"
echo "cds-dev      - Start CDS development server"
echo "deno-dev     - Start Deno development server"
echo "db-reset     - Reset database and generate mock data"
echo "test-api     - Test the Grant Management API"
echo ""
echo "📦 Container & Deployment Commands:"
echo "==================================="
echo "ctz-build    - Build containers with CTZ"
echo "ctz-push     - Build and push containers"
echo "helm-deploy  - Deploy with Helm charts"
echo "k8s-deploy   - Deploy to Kubernetes with CDS"
echo "setup-ns     - Create new namespace"
echo ""

# Show URLs
echo "🌐 Available URLs:"
echo "=================="
echo "CDS OData Service: http://localhost:4004"
echo "React Router App:  http://localhost:3000"
echo "Vite Dev Server:   http://localhost:5173"
echo "Production Server: http://localhost:8080"
echo ""

# Show helpful aliases
echo "🔧 Available Aliases:"
echo "====================="
echo "cds-dev      - Start CDS development server"
echo "cds-build    - Build CDS project"
echo "cds-deploy   - Deploy to database"
echo "cds-serve    - Start CDS production server"
echo "cds-watch    - Start CDS watch mode"
echo "cds-debug    - Start CDS debug mode"
echo "cds-lint     - Lint CDS files"
echo "cds-compile  - Compile CDS to various targets"
echo "deno-dev     - Start Deno development server"
echo "deno-build   - Build Deno project"
echo "deno-start   - Start production server"
echo "ctz-build    - Build containers with CTZ"
echo "ctz-push     - Build and push containers"
echo "helm-deploy  - Deploy with Helm charts"
echo "k8s-deploy   - Deploy to Kubernetes with CDS"
echo "setup-ns     - Create new namespace"
echo "db-reset     - Reset database and generate mock data"
echo "db-view      - Open SQLite database viewer"
echo "logs         - View development logs"
echo "test-api     - Test the Grant Management API"
echo ""

echo "✅ Setup check complete!"
echo ""
echo "📚 For more information, see:"
echo "   - .devcontainer/README.md"
echo "   - .cline/grant_managmant_api.md"
echo "   - https://cap.cloud.sap/docs/"
echo "   - https://deno.land/manual"
echo ""
echo "Happy coding! 🚀"
