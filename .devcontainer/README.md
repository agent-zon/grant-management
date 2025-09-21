# OAuth 2.0 Grant Management API - Dev Container

This dev container provides a complete development environment for the OAuth 2.0 Grant Management API project, including all necessary tools and dependencies for both CDS (SAP CAP) and Deno development.

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Docker Engine](https://docs.docker.com/engine/install/)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd agent-grants
   ```

2. **Open in Dev Container:**

   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Dev Containers: Reopen in Container"
   - Select the command and wait for the container to build

3. **Start Development:**

   ```bash
   # Start CDS development server
   cds-dev

   # In another terminal, start Deno development server
   deno-dev
   ```

## 🛠️ Available Tools

### Core Development Tools

- **Node.js 20** - For CDS development
- **Deno** - For server and frontend development
- **TypeScript** - Type checking and compilation
- **SQLite** - Local database
- **Git** - Version control
- **Docker** - Containerization
- **Kubernetes** - Deployment orchestration
- **Helm** - Package management for Kubernetes

### Development Servers

- **CDS OData Service** - http://localhost:4004
- **React Router App** - http://localhost:3000
- **Vite Dev Server** - http://localhost:5173
- **Production Server** - http://localhost:8080

## 📋 Available Commands

### CDS Commands

```bash
cds-dev      # Start CDS development server (watch mode)
cds-build    # Build CDS project
cds-deploy   # Deploy to database
cds-serve    # Start CDS production server
cds-watch    # Start CDS watch mode
cds-debug    # Start CDS debug mode
cds-lint     # Lint CDS files
cds-compile  # Compile CDS to various targets
```

### Deno Commands

```bash
deno-dev     # Start Deno development server
deno-build   # Build Deno project for production
deno-start   # Start production server
```

### Container & Deployment Commands

```bash
ctz-build    # Build containers with CTZ
ctz-push     # Build and push containers
helm-deploy  # Deploy with Helm charts
k8s-deploy   # Deploy to Kubernetes with CDS
setup-ns     # Create new namespace with setup script
```

### Database Commands

```bash
db-reset     # Reset database and regenerate mock data
db-view      # Open SQLite database viewer
```

### Development Commands

```bash
logs         # View development logs
test-api     # Test the Grant Management API endpoints
```

## 🏗️ Project Structure

```
/workspace/
├── .devcontainer/          # Dev container configuration
│   ├── devcontainer.json   # Main dev container config
│   ├── Dockerfile          # Custom Docker image
│   ├── docker-compose.yml  # Multi-service setup
│   └── post-create.sh      # Setup script
├── .vscode/                # VS Code workspace settings
│   ├── settings.json       # Workspace settings
│   ├── launch.json         # Debug configurations
│   ├── tasks.json          # Build tasks
│   └── extensions.json     # Recommended extensions
├── db/                     # CDS database schema and data
│   ├── schema.cds          # OAuth 2.0 Grant Management schema
│   ├── mockdata.cds        # Sample data
│   └── data/               # CSV data files
├── srv/                    # Deno server and React Router app
│   ├── grant-management-service.cds  # CDS service definition
│   ├── grant-management-service.js   # Service implementation
│   ├── deno.jsonc          # Deno configuration
│   ├── server.ts           # Deno server
│   └── app/                # React Router application
├── package.json            # Main project dependencies
└── cds.json               # CDS configuration
```

## 🔧 Development Workflow

### 1. Database Development

```bash
# Reset database with fresh schema and data
db-reset

# View database contents
db-view

# Generate new mock data
npm run mockdata
```

### 2. CDS Service Development

```bash
# Start CDS development server
cds-dev

# Build and deploy changes
cds-build && cds-deploy
```

### 3. Frontend Development

```bash
# Start Deno development server
deno-dev

# Build for production
deno-build
```

### 4. API Testing

```bash
# Test Grant Management API
test-api

# Test specific endpoints
curl -X GET http://localhost:4004/api/grants
curl -X GET http://localhost:4004/api/grants/{grant_id}
```

## 🐛 Debugging

### VS Code Debug Configurations

- **Debug CDS Service** - Debug the CDS OData service
- **Debug Deno Server** - Debug the Deno server
- **Debug Full Stack** - Debug both services simultaneously

### Debugging Tips

1. **Set breakpoints** in your TypeScript/JavaScript files
2. **Use the Debug Console** to inspect variables
3. **Check the Terminal** for server logs
4. **Use browser dev tools** for frontend debugging

## 🚀 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t oauth-grant-management .

# Run container
docker run -p 8080:8080 oauth-grant-management
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get pods
kubectl get services
```

### Helm Deployment

```bash
# Install with Helm
helm install oauth-grant-management ./chart

# Upgrade deployment
helm upgrade oauth-grant-management ./chart
```

## 📚 Documentation

- [OAuth 2.0 Grant Management API Specification](.cline/grant_managmant_api.md)
- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [Deno Documentation](https://deno.land/manual)
- [React Router v7 Documentation](https://reactrouter.com/)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/remote/containers)

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**

   - CDS Service: 4004
   - React Router: 3000
   - Vite Dev: 5173
   - Production: 8080

2. **Database Issues**

   ```bash
   # Reset database
   db-reset
   ```

3. **Dependency Issues**

   ```bash
   # Reinstall Node.js dependencies
   npm install

   # Reinstall Deno dependencies
   cd srv && deno cache --reload deno.jsonc
   ```

4. **Container Issues**
   ```bash
   # Rebuild container
   # In VS Code: Ctrl+Shift+P -> "Dev Containers: Rebuild Container"
   ```

### Getting Help

- Check the [troubleshooting section](#troubleshooting) above
- Review the [documentation links](#documentation)
- Check the project's issue tracker
- Contact the development team

## 🎯 Next Steps

1. **Explore the API** - Use the provided test commands to explore the Grant Management API
2. **Read the Documentation** - Review the OAuth 2.0 Grant Management specification
3. **Start Developing** - Make changes to the schema, service, or frontend
4. **Test Your Changes** - Use the provided test commands to validate your work
5. **Deploy** - Use the deployment commands to test in different environments

---

**Happy Coding!** 🚀
