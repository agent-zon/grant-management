# Agent Grants - OAuth 2.0 Grant Management

A comprehensive grant management system that implements the OAuth 2.0 Grant
Management API specification, allowing clients to explicitly manage their grants
with the authorization server.

## Deployment

- **API Docs**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/api-docs

- **Grant Management User Dashbaord**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/grants-management/Grants

- **OAuth Flow Step-by-Step Demo**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/demo/index

## Features

- **OAuth 2.0 Grant Management API**: Full implementation of the Grant
  Management specification using SAP CAP framework
- **CDS Service**: Core Data Services implementation with proper entity modeling
- **Authorization Details**: Model tools and operations as Rich Authorization
  Request (RAR) authorization details
- **MCP Consent Middleware**: Tool-level authorization proxy for Model Context Protocol agents
- **Session Management**: Track MCP agent sessions and link them to OAuth grants
- **Tool Policy Integration**: Group related tools for batch consent requests
- **Web-based UI**: User-friendly interface for managing consent grants
- **RESTful API**: Programmatic access for OAuth clients
- **Real-time Monitoring**: Live tracking of grant usage and status
- **Security**: Proper authorization and token management

## Project Structure

| File or Folder | Purpose                                   |
| -------------- | ----------------------------------------- |
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

#### Grant Management API

- `GET /api/grants` - Grants list
- `GET /api/grants?$expand=authorization_details` - Grants list with authorization_details
- `GET /api/grants/{grant_id}` - Query grant status
- `DELETE /api/grants/{grant_id}` - Revoke grant

See [srv/mcp-consent-middleware/README.md](srv/mcp-consent-middleware/README.md) for detailed documentation.

### Web UI

- `/grants` - Grant management dashboard
- `/grants/{id}` - Individual grant details
- `/grants/{id}/grant` - Grant consent
- `/grants/{id}/revoke` - Revoke consent


#### Authorization Flow Extensions

The specification extends the OAuth 2.0 authorization flow with:

- New authorization request parameters: `grant_id` and `grant_management_action`
- New token response parameter: `grant_id`
- Grant management actions: `create`, `update`, and `replace`

#### API Authorization

Access to the Grant Management API requires an access token with appropriate scopes:
- `grant_management_query`: For querying grant status
- `grant_management_revoke`: For revoking grants

#### Metadata

Authorization servers supporting this API provide metadata including:
- `grant_management_actions_supported`: Actions supported by the server
- `grant_management_endpoint`: URL of the Grant Management API endpoint
- `grant_management_action_required`: Whether grant management actions are required in requests


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

Deploy the application to your SAP BTP Kyma environment using the provided
`cds up --to k8s --namespace <your-namespace>` command.

This will create the necessary Kubernetes resources, including deployments,
services, and ingress rules.

### Hybrid Development

For hybrid development, you can run the CDS server locally while connecting to
a remote service in your Kyma environment.
Example:

```bash
#change default namespace to your namespace, this command works only in default namespace
kubectl config set-context --current --namespace=grant-managment
cds bind auth --to agent-grants-srv-auth --on k8s
```

Then start the CDS server locally:

```bash
cds watch --profile hybrid
```

Retrieve environment variables from the remote service:

```bash
npx cds env requires.auth --profile hybrid --resolve-bindings
```



## Learn More

- [OAuth 2.0 Grant Management Specification](https://tools.ietf.org/html/draft-ietf-oauth-grant-management)
- [SAP CAP Documentation](https://cap.cloud.sap/docs/get-started/)
- [React Router Documentation](https://reactrouter.com/)
