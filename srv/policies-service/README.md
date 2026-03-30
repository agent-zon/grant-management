# Policies CAP - AI Agent Policies Management

A minimal CAP application for managing AI agent policies with a standalone web interface.

## Features

- **Standalone Web UI** - Clean, focused interface for policy management
- **Action Types** - Support for Allow/Deny/Ask For Consent rules
- **YAML Template Integration** - Auto-loads ariba template configuration
- **ODRL Compliance** - Stores policies in ODRL JSON-LD format
- **SQLite Database** - Lightweight data persistence
- **Kubernetes Ready** - Includes Helm charts for Kyma deployment

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run watch

# Access the application
# UI: http://localhost:4004/app/
# Service: http://localhost:4004/policies/
```

## Database Schema

### AgentPolicies
- `agentId` (String) - Primary key
- `policies` (LargeString) - ODRL JSON policies
- `yaml` (LargeString) - YAML template data
- `createdAt`, `modifiedAt` (Timestamps)

### YamlTemplates  
- `filename` (String) - Primary key
- `content` (LargeString) - YAML content
- `createdAt`, `modifiedAt` (Timestamps)

## API Endpoints

### OData Services
- `GET /policies/AgentPolicies` - List all agent policies
- `GET /policies/AgentPolicies('A532408')` - Get specific agent policy
- `POST /policies/AgentPolicies` - Create new agent policy
- `PATCH /policies/AgentPolicies('A532408')` - Update existing policy

### Actions
- `POST /policies/getYamlTemplates` - List available YAML templates
- `POST /policies/getYamlTemplate` - Get specific template content

## Docker Deployment

### Build Image
```bash
docker build -t policies-cap:latest .
```

### Run Container
```bash
docker run -p 4004:4004 policies-cap:latest
```

## Kyma/Kubernetes Deployment

### Prerequisites
- Kubernetes cluster with Helm installed
- kubectl configured for your cluster

### Deploy with Helm

1. **Build and Push Image**
   ```bash
   # Build image
   docker build -t your-registry/policies-cap:latest .
   
   # Push to registry
   docker push your-registry/policies-cap:latest
   ```

2. **Update Values**
   ```bash
   # Edit helm/values.yaml
   # Set image.repository to your registry URL
   ```

3. **Deploy to Kyma**
   ```bash
   # Install with Helm
   helm install policies-cap ./helm
   
   # Or upgrade existing deployment
   helm upgrade policies-cap ./helm
   ```

4. **Access Application**
   ```bash
   # Port forward for local access
   kubectl port-forward svc/policies-cap 4004:4004
   
   # Or configure ingress in values.yaml
   ```

### Helm Configuration

Key configuration options in `helm/values.yaml`:

```yaml
# Container image
image:
  repository: your-registry/policies-cap
  tag: latest

# Service configuration  
service:
  port: 4004

# Resource limits
resources:
  requests:
    memory: 256Mi
    cpu: 100m
  limits:
    memory: 512Mi
    cpu: 500m

# Persistent storage for database
persistence:
  enabled: true
  size: 1Gi
  
# Ingress for external access
ingress:
  enabled: true
  hosts:
    - host: policies-cap.kyma.local
```

## Environment Variables

- `NODE_ENV` - Node.js environment (production)
- `PORT` - Application port (default: 4004)

## Health Checks

The application includes:
- **Liveness Probe**: `GET /` (checks if app is running)
- **Readiness Probe**: `GET /` (checks if app is ready to serve)
- **Docker Health Check**: Built into container

## File Structure

```
policies-cap/
├── package.json          # Node.js dependencies
├── Dockerfile            # Container image
├── .dockerignore         # Docker ignore rules
├── db/
│   ├── schema.cds        # Database model
│   └── data/             # Sample data
├── srv/
│   ├── policies-service.cds  # Service definition
│   └── policies-service.js   # Service implementation
├── app/
│   └── index.html        # Web UI
├── yaml-examples/
│   └── ariba_yaml.yaml   # Sample YAML template
└── helm/                 # Kubernetes deployment
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
```

## Usage

1. **Access Web UI** at `/app/`
2. **Select Action Type** (Allow/Deny/Ask For Consent)
3. **Choose Target** from auto-loaded ariba template
4. **Set Constraints** (access-level, risk-level, etc.)
5. **Add Policy Rules** and **Save All**

## Troubleshooting

### Database Issues
- Database is automatically created on first run
- Check persistent volume if using Kubernetes

### Image Pull Issues  
- Verify image repository URL in values.yaml
- Ensure image exists in registry
- Check Kubernetes image pull secrets

### Service Access
- Verify service is running: `kubectl get pods`
- Check service endpoints: `kubectl get svc`
- Port forward for debugging: `kubectl port-forward svc/policies-cap 4004:4004`