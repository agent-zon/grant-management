# Agent Grants - OAuth 2.0 Grant Management

A comprehensive grant management system that implements the OAuth 2.0 Grant
Management API specification, allowing clients to explicitly manage their grants
with the authorization server.

## Live Deployment
The application is deployed on SAP BTP Kyma environment and can be accessed at:
- https://grant-management-dashboard.c-127c9ef.stage.kyma.ondemand.com
  


## Features

- **OAuth 2.0 Grant Management API**: Full implementation of the Grant
  Management specification using SAP CAP framework
- **CDS Service**: Core Data Services implementation with proper entity modeling
- **Authorization Details**: Model tools and operations as Rich Authorization
  Request (RAR) authorization details
- **Web-based UI**: User-friendly interface for managing consent grants
- **RESTful API**: Programmatic access for OAuth clients
- **Real-time Monitoring**: Live tracking of grant usage and status
- **Security**: Proper authorization and token management

## Project Structure

| File or Folder | Purpose                                   |
| -------------- |-------------------------------------------|
| `app/`         | approuter configuration                   |
| `db/`          | CDS entities, schema, and initial data    |
| `srv/`         | CDS service definition and implementation |
| `chart/`       | Kubernetes deployment configuration       |
| `docs/`        | Documentation and consent scenarios       |
| `package.json` | Project metadata and configuration        |

## API Documentation

The application implements the OAuth 2.0 Grant Management API specification. See
[GRANT_MANAGEMENT_API.md](GRANT_MANAGEMENT_API.md) for detailed API
documentation.

### Key Endpoints

- `GET /api/grants` - Server metadata
- `GET /api/grants/{grant_id}` - Query grant status
- `DELETE /api/grants/{grant_id}` - Revoke grant

### Web UI

- `/grants` - Grant management dashboard
- `/grants/{id}` - Individual grant details
- `/grants/{id}/grant` - Grant consent
- `/grants/{id}/revoke` - Revoke consent

## Getting Started

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the CDS development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:4004`

The CDS server will automatically:

- Deploy the database schema
- Load initial data for MCP servers and tools
- Start the Grant Management service
- Serve the web UI

### Production Deployment

The application is configured for deployment on SAP BTP Kyma with:

- Kubernetes manifests in `chart/`
- Docker containerization
- OAuth 2.0 integration

## Learn More

- [OAuth 2.0 Grant Management Specification](https://tools.ietf.org/html/draft-ietf-oauth-grant-management)
- [SAP CAP Documentation](https://cap.cloud.sap/docs/get-started/)
- [React Router Documentation](https://reactrouter.com/)
