#!/bin/bash

# OAuth 2.0 Grant Management API - Dev Container Setup Script
set -e

echo "🚀 Setting up OAuth 2.0 Grant Management API development environment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install additional system dependencies
echo "🔧 Installing system dependencies..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    jq \
    sqlite3 \
    build-essential \
    python3 \
    python3-pip

# Install Node.js LTS (if not already installed)
echo "📦 Installing Node.js LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install npm packages for the main project
echo "📦 Installing main project dependencies..."
cd /workspace
npm install

# Install CDS CLI globally
echo "📦 Installing SAP CAP CLI..."
npm install -g @sap/cds-dk

# Install Deno dependencies
echo "📦 Installing Deno dependencies..."
cd /workspace/srv
deno cache --reload deno.jsonc

# Install additional Deno tools
echo "📦 Installing Deno development tools..."
deno install --allow-net --allow-read --allow-write -n deno-fmt https://deno.land/std@0.208.0/fmt/colors.ts
deno install --allow-net --allow-read --allow-write -n deno-lint https://deno.land/std@0.208.0/lint/mod.ts

# Set up CDS database
echo "🗄️ Setting up CDS database..."
cd /workspace
npm run build
npm run deploy

# Generate mock data
echo "📊 Generating mock data..."
npm run mockdata

# Set up Git configuration (if not already set)
echo "🔧 Setting up Git configuration..."
if [ -z "$(git config --global user.name)" ]; then
    git config --global user.name "Dev Container User"
    git config --global user.email "dev@container.local"
fi

# Create useful aliases
echo "🔧 Setting up development aliases..."
cat >> ~/.bashrc << 'EOF'

# OAuth 2.0 Grant Management API aliases
alias cds-dev="cd /workspace && npm run dev"
alias cds-build="cd /workspace && npm run build"
alias cds-deploy="cd /workspace && npm run deploy"
alias cds-serve="cd /workspace && npm run start"
alias cds-watch="cd /workspace && npm run watch"
alias cds-debug="cd /workspace && npm run debug"
alias cds-lint="cd /workspace && npm run lint"
alias cds-compile="cd /workspace && npm run compile"

# Deno aliases
alias deno-dev="cd /workspace/srv && deno task dev"
alias deno-build="cd /workspace/srv && deno task build"
alias deno-start="cd /workspace/srv && deno task start"

# Database aliases
alias db-reset="cd /workspace && rm -f db.sqlite && npm run deploy && npm run mockdata"
alias db-view="cd /workspace && sqlite3 db.sqlite"

# Container and deployment aliases
alias ctz-build="cd /workspace && npm run build:containers"
alias ctz-push="cd /workspace && npm run build:push"
alias helm-deploy="cd /workspace && npm run deploy:helm"
alias k8s-deploy="cd /workspace && npm run deploy"
alias setup-ns="cd /workspace && npm run setup-namespace"

# Development shortcuts
alias logs="cd /workspace && npm run dev 2>&1 | tee dev.log"
alias test-api="curl -X GET http://localhost:4004/api/grants"

EOF

# Set up VS Code workspace settings
echo "🔧 Setting up VS Code workspace settings..."
mkdir -p /workspace/.vscode
cat > /workspace/.vscode/settings.json << 'EOF'
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": true,
  "deno.suggest.imports.hosts": {
    "https://deno.land": true,
    "https://esm.sh": true,
    "https://cdn.skypack.dev": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.deno": true,
    "**/gen": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.deno": true,
    "**/gen": true,
    "**/dist": true,
    "**/build": true
  }
}
EOF

# Create launch configurations for debugging
echo "🔧 Setting up VS Code launch configurations..."
cat > /workspace/.vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CDS Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/@sap/cds/bin/cds.js",
      "args": ["serve", "--in-memory"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development",
        "CDS_ENV": "development"
      }
    },
    {
      "name": "Debug Deno Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/srv/server.ts",
      "runtimeExecutable": "deno",
      "runtimeArgs": ["run", "--allow-all"],
      "cwd": "${workspaceFolder}/srv",
      "console": "integratedTerminal"
    }
  ]
}
EOF

# Create tasks for common operations
echo "🔧 Setting up VS Code tasks..."
cat > /workspace/.vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "CDS: Start Development Server",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "CDS: Build Project",
      "type": "shell",
      "command": "npm",
      "args": ["run", "build"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Deno: Start Development Server",
      "type": "shell",
      "command": "deno",
      "args": ["task", "dev"],
      "options": {
        "cwd": "${workspaceFolder}/srv"
      },
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Database: Reset and Deploy",
      "type": "shell",
      "command": "bash",
      "args": ["-c", "rm -f db.sqlite && npm run deploy && npm run mockdata"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "problemMatcher": []
    }
  ]
}
EOF

# Create a helpful README for the dev container
echo "📚 Creating dev container documentation..."
cat > /workspace/.devcontainer/README.md << 'EOF'
# OAuth 2.0 Grant Management API - Dev Container

This dev container provides a complete development environment for the OAuth 2.0 Grant Management API project.

## 🚀 Quick Start

1. **Start CDS Development Server:**
   ```bash
   cds-dev
   # or
   npm run dev
   ```

2. **Start Deno Development Server:**
   ```bash
   deno-dev
   # or
   cd srv && deno task dev
   ```

3. **Access the Application:**
   - CDS OData Service: http://localhost:4004
   - React Router App: http://localhost:3000
   - Vite Dev Server: http://localhost:5173

## 🛠️ Available Commands

### CDS Commands
- `cds-dev` - Start CDS development server
- `cds-build` - Build CDS project
- `cds-deploy` - Deploy to database

### Deno Commands
- `deno-dev` - Start Deno development server
- `deno-build` - Build Deno project
- `deno-start` - Start production server

### Database Commands
- `db-reset` - Reset database and regenerate mock data
- `db-view` - Open SQLite database viewer

### Development Commands
- `logs` - View development logs
- `test-api` - Test the Grant Management API

## 📁 Project Structure

```
/workspace/
├── db/                    # CDS database schema and data
├── srv/                   # Deno server and React Router app
├── .devcontainer/         # Dev container configuration
├── .vscode/              # VS Code workspace settings
└── package.json          # Main project dependencies
```

## 🔧 Development Tools

- **Node.js** - For CDS development
- **Deno** - For server and frontend development
- **SQLite** - Local database
- **Docker** - Containerization
- **Kubernetes** - Deployment
- **Git** - Version control

## 📚 Documentation

- [OAuth 2.0 Grant Management API Specification](.cline/grant_managmant_api.md)
- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [Deno Documentation](https://deno.land/manual)
- [React Router v7 Documentation](https://reactrouter.com/)

## 🐛 Troubleshooting

1. **Database Issues:**
   ```bash
   db-reset
   ```

2. **Dependency Issues:**
   ```bash
   npm install
   cd srv && deno cache --reload deno.jsonc
   ```

3. **Port Conflicts:**
   - CDS Service: 4004
   - React Router: 3000
   - Vite Dev: 5173
   - Production: 8080
EOF

echo "✅ Dev container setup complete!"
echo ""
echo "🚀 Quick start commands:"
echo "  cds-dev     - Start CDS development server"
echo "  deno-dev    - Start Deno development server"
echo "  db-reset    - Reset database"
echo "  test-api    - Test the API"
echo ""
echo "📚 Documentation: .devcontainer/README.md"
echo "🌐 CDS Service: http://localhost:4004"
echo "🌐 React App: http://localhost:3000"
