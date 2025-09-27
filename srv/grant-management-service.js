import cds from "@sap/cds";

class GrantManagementHandlers extends cds.ApplicationService {
  async init() {
    this.on("metadata", async () => {
      return {
        grant_management_actions_supported: [
          "create",
          "read",
          "update",
          "delete",
          "revoke",
        ],
        grant_management_endpoint: "/api/grants",
        grant_management_action_required: false,
        server_info: {
          name: "Grant Management Service",
          version: cds?.version || "unknown",
          supported_scopes: ["tools:read", "tools:write", "data:export"],
        },
      };
    });

    return super.init();
  }
}

export default GrantManagementHandlers;

