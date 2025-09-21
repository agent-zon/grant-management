import cds from "@sap/cds";

class GrantManagementService extends cds.ApplicationService {
  // GET /grants - Server metadata endpoint
  async getMetadata(req) {
    const metadata = await SELECT.one.from(GrantManagementMetadata).where({
      id: "1",
    });

    if (!metadata) {
      // Return default metadata if not configured
      return {
        grant_management_actions_supported: [
          "query",
          "revoke",
          "create",
          "update",
          "replace",
        ],
        grant_management_endpoint: `${req.headers.host}/grants`,
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

    return {
      grant_management_actions_supported: JSON.parse(
        metadata.grantManagementActionsSupported || "[]",
      ),
      grant_management_endpoint: metadata.grantManagementEndpoint,
      grant_management_action_required: metadata.grantManagementActionRequired,
      server_info: {
        name: metadata.serverName,
        version: metadata.serverVersion,
        supported_scopes: JSON.parse(metadata.supportedScopes || "[]"),
      },
    };
  }
}

export default GrantManagementService;
