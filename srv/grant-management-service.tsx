import cds from "@sap/cds";


class GrantManagementService extends cds.ApplicationService {
  async metadata(req:cds.Request) {
    console.log("Grant Management Metadata requested" , req);
    return {
      grant_management_actions_supported: [
        "query",
        "revoke",
        "create",
        "update",
        "replace",
      ],
      grant_management_endpoint:`${cds.context?.http?.req.protocol}://${cds.context?.http?.req?.hostname}${cds.context?.http?.req?.baseUrl}/grants`,
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
    
  }
  init() {
    // Bind the function name from CDS (getMetadata) to the handler
    this.on("metadata", this.metadata.bind(this));
    return super.init && super.init();
  }
}

export default GrantManagementService;
