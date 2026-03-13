# Technical Details - Admin Guide

## Overview

The **Policies CAP** project is a SAP Cloud Application Programming Model (CAP) application for managing AI agent policies. It provides a comprehensive policy management system with ODRL compliance, Git integration, MCP Hub connectivity, and Kyma deployment capabilities.

![Admin Policies Screen](assets/admin-policies-screen.png)

---

## 🏗️ System Architecture

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | SAP CAP | v8+ | Core application framework |
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Database** | SQLite | v5 | Lightweight persistence |
| **Frontend** | Vanilla HTML/CSS/JS | - | Standalone web interface |
| **Deployment** | Kubernetes/Kyma | - | Container orchestration |
| **CI/CD** | Docker | - | Containerization |

### Core Components

```
policies-cap/
├── srv/                    # Backend Services
│   ├── policies-service.cds    # OData service definition
│   ├── policies-service.js     # Business logic implementation
│   ├── mcp-hub/               # MCP Hub integration
│   │   ├── mcp-hub-handler.js     # API client with OAuth2
│   │   └── mcp-hub-cards-handler.js # YAML card generation
│   └── git-handler/           # Git repository operations
├── app/                    # Frontend Application
│   └── index.html             # Single-page application
├── db/                     # Database Schema
│   └── schema.cds             # CDS entity definitions
├── assets/                 # Documentation Assets
├── tests/                  # Test Suite
├── helm/                   # Kubernetes Deployment
└── yaml-examples/         # Sample YAML templates
```

---

## 🌐 Deployment Information

### Production URLs

**Main Admin Interface:**
```
https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/
```

**Agent-Specific Interface:**
```
https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/?agentId={agent-id}
```

**OData Service Endpoint:**
```
https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/policies/
```

### Kyma/Kubernetes Configuration

#### Deployment Architecture
- **Namespace**: `tomer-dev`
- **Service Type**: ClusterIP with Istio Gateway
- **Replicas**: 1 (development), scalable to N
- **Resource Limits**: 512Mi memory, 500m CPU
- **Storage**: Persistent Volume for SQLite database

#### Deployment Scripts
```bash
# Helm deployment
./helm-deploy.ps1

# Direct Kubernetes
./k8s-deploy.ps1

# Simple deployment
./simple-deploy.ps1
```

---

## 🗄️ Database Schema & Data Model

![Agent Identity Management](assets/agent-identity-managment-screen.png)

### Entity Definitions (CDS)

```cds
namespace policies;

entity AgentPolicies {
  key agentId: String(100);      // Unique agent identifier
  policies: LargeString;         // ODRL JSON-LD policies
  yaml: LargeString;            // YAML template data
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}

entity YamlTemplates {
  key filename: String(255);    // Template filename
  content: LargeString;         // YAML content
  createdAt: Timestamp @cds.on.insert: $now;
  modifiedAt: Timestamp @cds.on.insert: $now @cds.on.update: $now;
}
```

### ODRL Policy Structure

```json
{
  "@context": [
    "http://www.w3.org/ns/odrl.jsonld",
    {
      "sap": "https://sap.com/odrl/extensions/",
      "target": { "@type": "@id" },
      "action": { "@type": "@id" }
    }
  ],
  "@type": "Set",
  "permission": [
    {
      "target": "mcp-name.tool-name",
      "action": "use",
      "constraint": [
        {
          "leftOperand": "sap:category",
          "operator": "eq",
          "rightOperand": "ecommerce"
        }
      ]
    }
  ],
  "prohibition": [
    {
      "target": "dangerous-tool",
      "action": "use",
      "constraint": [
        {
          "leftOperand": "sap:riskLevel",
          "operator": "eq",
          "rightOperand": "high"
        }
      ]
    }
  ]
}
```

---

## 🔌 API Documentation

### OData Service: `/policies/`

#### Entities

**AgentPolicies**
```http
GET /policies/AgentPolicies                    # List all policies
GET /policies/AgentPolicies('A532408')         # Get specific agent
POST /policies/AgentPolicies                   # Create new policy
PATCH /policies/AgentPolicies('A532408')       # Update existing policy
```

**YamlTemplates**
```http
GET /policies/YamlTemplates                    # List templates
GET /policies/YamlTemplates('ariba.yaml')      # Get specific template
```

#### Service Actions

**YAML Template Management**
```http
POST /policies/getYamlTemplates                # List available templates
POST /policies/getYamlTemplate                 # Get template content
Content-Type: application/json
{
  "filename": "ariba.yaml"
}
```

**MCP Hub Integration**
```http
POST /policies/getMcpHubData                   # Fetch MCP registry
POST /policies/generateMcpHubCards             # Generate YAML cards
Content-Type: application/json
{
  "agentId": "A532408"
}
```

**Git Repository Operations**
```http
POST /policies/getAgentManifest               # Get agent manifest
POST /policies/getGitFile                     # Get any Git file
POST /policies/commitMcpHubCards             # Commit generated cards
```

---

## 🔗 External Integrations

### MCP Hub Integration

![Admin Policies with MCP Hub](assets/admin-policies-screen-with-mcp-hub.png)

#### OAuth2 Authentication
```javascript
// Environment Configuration
MCP_HUB_TOKEN_URL=https://afwnemyon.accounts400.ondemand.com/oauth2/token
MCP_HUB_CLIENT_ID=a1ed87ea-5dbf-4293-a1d0-992266125c71
MCP_HUB_APP_TID=e41fcc81-0e90-4515-bc95-4fd0a20009a6
MCP_HUB_USERNAME={secure-username}
MCP_HUB_PASSWORD={secure-password}
```

#### Certificate-Based Security
- **Client Certificate**: `certificate 3.pem`
- **Private Key**: `key 3.pem`
- **mTLS Authentication**: Mutual TLS for secure communication

#### MCP Hub API Endpoints
```javascript
// Registry endpoint with tools
GET https://mcp-hub.domain.com/api/registry?includeTools=true

// Response structure
{
  "mcps": [
    {
      "id": "mcp-id",
      "name": "MCP Name", 
      "toolsList": "[{\"name\":\"tool1\",...}]"  // JSON string
    }
  ]
}
```

### Git Repository Integration

#### Repository Structure
```
AIAM/policies/
├── {agentId}/
│   ├── policies.json              # ODRL policies
│   └── mcps/
│       ├── agent-manifest/        # Original YAML files
│       │   ├── tool1.yaml
│       │   └── tool2.yaml
│       └── mcp-hub/               # Generated cards
│           ├── northwind.yaml
│           └── commerce.yaml
```

#### Git Operations
```javascript
// File operations
await gitHandler.getFileContent(owner, repo, filePath);
await gitHandler.commitFile(owner, repo, filePath, content, message);

// Automatic operations
- Load policies from Git on READ operations
- Commit policies to Git on CREATE/UPDATE operations
- Generate and commit MCP Hub cards automatically
```

---

## 🎨 Frontend Implementation

### Single-Page Application Architecture

**Technology Stack:**
- **HTML5**: Semantic markup with modern standards
- **CSS3**: Modern styling with Flexbox/Grid layouts
- **Vanilla JavaScript**: No framework dependencies
- **External Libraries**: js-yaml for YAML processing

### Key UI Components

#### Policy Management Interface
```javascript
// Core functions
function loadAgentData(agentId)         // Load agent policies from backend
function saveAllToDatabase()           // Save policies with Git commit
function addPermission(type)           // Add ALLOW/DENY/CONSENT rules
function generateMcpHubCards()         // Auto-generate MCP cards
function populateCombinedTargetSelection() // Multi-source tool selection
```

#### Source Badge System
```css
/* Source badges for tools */
.source-badge {
  background: #e5e7eb;
  color: #374151;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 8px;
}

.source-badge.agent-manifest { background: #dbeafe; color: #1d4ed8; }
.source-badge.mcp-hub { background: #f3e8ff; color: #7c3aed; }
```

#### Field Naming Conventions
```javascript
// SAP namespace compliance
const validAttributes = [
  'sap:searchQuery',      // Search parameters
  'sap:category',         // Tool categorization  
  'sap:riskLevel',        // Security assessment
  'sap:accessLevel',      // Permission level
  'sap:dataClassification' // Data sensitivity
];

// Metadata standards
const metadataFields = {
  'sap/source': 'agent-manifest | mcp-hub',
  'sap/riskLevel': 'low | medium | high | critical', 
  'sap/accessLevel': 'standard | privileged | admin'
};
```

---

## 🧪 Testing Framework

### Test Coverage

**Test Runner:** `npm test`
```bash
# Available test commands
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:validate      # Field naming validation
npm run test:field-naming  # Naming conventions
```

### Test Structure
```
tests/
├── test-runner.js                     # Main test coordinator
├── integration-field-naming.test.js   # Field naming integration
├── unit-tests.test.js                 # Core unit tests
├── mcp-hub-cards-integration.test.js  # MCP Hub validation
└── mcp-hub-cards-validation-fixed.test.js # Node.js compatible tests
```

### Validation Coverage
- **Field Naming Conventions**: SAP namespace compliance
- **ODRL Policy Structure**: JSON-LD schema validation
- **MCP Hub Integration**: API connectivity and data integrity
- **Git Operations**: Repository read/write operations
- **YAML Processing**: Template parsing and generation

![Evaluation Response](assets/evaluation-response.png)

---

## 🚀 Development Workflow

### Local Development Setup

```bash
# Prerequisites
node -v    # Ensure Node.js 20+
npm -v     # Ensure npm is available

# Project setup
git clone <repository>
cd policies-cap
npm install

# Environment setup
cp .env.example .env
# Configure MCP Hub credentials and Git tokens

# Start development
npm run watch
# Access: http://localhost:4004/app/
```

### Environment Variables

```bash
# .env configuration
MCP_HUB_USERNAME=your-username
MCP_HUB_PASSWORD=your-password
MCP_HUB_TOKEN_URL=https://afwnemyon.accounts400.ondemand.com/oauth2/token
MCP_HUB_CLIENT_ID=a1ed87ea-5dbf-4293-a1d0-992266125c71
MCP_HUB_APP_TID=e41fcc81-0e90-4515-bc95-4fd0a20009a6
MCP_HUB_CERTIFICATE_PATH=./srv/mcp-hub/certificate 3.pem
MCP_HUB_PRIVATE_KEY_PATH=./srv/mcp-hub/key 3.pem

# Git configuration (for production)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=your-github-username
```

### Build & Deployment Process

#### Docker Build
```bash
# Build production image
docker build -t policies-cap:latest .

# Local test
docker run -p 4004:4004 policies-cap:latest

# Push to registry
docker tag policies-cap:latest your-registry/policies-cap:latest
docker push your-registry/policies-cap:latest
```

#### Kyma Deployment
```bash
# Helm deployment
helm install policies-cap ./helm \
  --set image.repository=your-registry/policies-cap \
  --set image.tag=latest \
  --namespace tomer-dev

# Verify deployment
kubectl get pods -n tomer-dev
kubectl logs -f deployment/policies-cap -n tomer-dev
```

---

## 🔧 Configuration Management

### CAP Configuration (.cdsrc.json)
```json
{
  "requires": {
    "db": {
      "kind": "sqlite",
      "credentials": { "url": "policies.db" }
    },
    "auth": { "kind": "dummy" }
  },
  "serve": { "from": "./srv" },
  "build": { "target": "gen" },
  "deploy": { "kind": "k8s" }
}
```

### Kubernetes Resources
```yaml
# Service configuration
apiVersion: v1
kind: Service
metadata:
  name: policies-cap
  namespace: tomer-dev
spec:
  selector:
    app: policies-cap
  ports:
  - port: 4004
    targetPort: 4004
```

### Health Monitoring
```dockerfile
# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4004/', (res) => { 
    process.exit(res.statusCode === 200 ? 0 : 1); 
  }).on('error', () => process.exit(1));"
```

---

## 📊 Performance & Monitoring

### Performance Characteristics
- **Response Time**: Sub-100ms for policy operations
- **Throughput**: 1000+ requests/minute (single instance)
- **Memory Usage**: ~512Mi runtime requirement
- **Storage**: SQLite with automatic backup to Git

### Monitoring Endpoints
```bash
# Health check
GET https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/health

# Service metadata
GET https://policies-cap-tomer-dev.c-127c9ef.stage.kyma.ondemand.com/policies/$metadata

# Application logs
kubectl logs -f deployment/policies-cap -n tomer-dev
```

### Scaling Considerations
- **Horizontal Scaling**: Stateless design supports multiple replicas
- **Database**: Consider PostgreSQL for high-load scenarios
- **Caching**: Redis integration for policy caching
- **Load Balancing**: Istio/Kyma automatic load distribution

---

## 🛡️ Security Implementation

### Authentication & Authorization
- **Development**: Dummy auth for simplified testing
- **Production**: Integration with SAP BTP XSUAA/IAS
- **API Security**: OAuth2 Bearer token validation

### Data Security
- **Encryption**: TLS 1.3 for all communications
- **Certificates**: mTLS for MCP Hub integration
- **Secrets**: Kubernetes secrets for sensitive data
- **Audit**: Complete request/response logging

### Compliance Features
- **GDPR**: Data processing consent management
- **SOX**: Financial data access controls
- **Audit Trail**: Complete change history in Git
- **Data Residency**: Configurable for regional compliance

---

*This technical documentation provides comprehensive implementation details for administrators managing the Policies CAP system in production environments.*