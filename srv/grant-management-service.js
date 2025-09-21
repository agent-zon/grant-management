const cds = require('@sap/cds');

class GrantManagementService extends cds.ApplicationService {
  // Default metadata for the Grant Management API
  async getMetadata(req) {
    return {
      grant_management_actions_supported: [
        'query',
        'revoke',
        'create',
        'update',
        'replace'
      ],
      grant_management_endpoint: `${req.headers.host}/grants`,
      grant_management_action_required: false,
      server_info: {
        name: 'Agent Grants Authorization Server',
        version: '1.0.0',
        supported_scopes: [
          'grant_management_query',
          'grant_management_revoke',
          'grant_management_create',
          'grant_management_update',
          'grant_management_replace'
        ]
      }
    };
  }

  init() {
    // Bind the function name from CDS (getMetadata) to the handler
    this.on('getMetadata', async (req) => this.getMetadata(req));
    return super.init && super.init();
  }
} 
