import cds from "@sap/cds";

// cds.middlewares.add ('*', (req, res, next) => {
//   res.setHeader('Content-Type', 'application/json');
//   res.setHeader('x-tag', 'before');
//   next();
// }, {before:'auth'})
// cds.middlewares.add ('*', (req, res, next) => {
//   res.setHeader('Content-Type', 'application/json');
//   res.setHeader('x-tag', 'after');
//   next();
// }, {after:'auth'})

class GrantManagementService extends cds.ApplicationService {
  // Default metadata for the Grant Management API
  async metadata() {
    return {
      grant_management_actions_supported: [
        "query",
        "revoke",
        "create",
        "update",
        "replace",
      ],
      grant_management_endpoint: `/grants`,
      grant_management_action_required: false,
      server_info: {
        name: "Agent Grants Authorization Server",
        version: "1.0.0",
        supported_scopes: [
          "grant_management_query",
          "grant_management_revoke",
          "grant_management_create",
          "grant_management_update",
          "grant_management_replace",
        ],
      },
    };
  }

  init() {
    // Bind the function name from CDS (getMetadata) to the handler
    this.on("metadata", async (req) => this.getMetadata(req));
    return super.init && super.init();
  }
}

export default GrantManagementService;
