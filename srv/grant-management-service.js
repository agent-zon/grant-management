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

  async init() {
    const { AuthorizationRequests, Grants } = this.entities;

    this.on('CreateRequest', async (req) => {
      const { sessionId, userId, workloadId, reason, grantId, authorization_details } = req.data;

      const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes default
      const shortCode = Math.random().toString(36).slice(2, 8);

      const request = await INSERT.into(AuthorizationRequests).entries({
        status: 'pending',
        sessionId,
        userId,
        workloadId,
        reason,
        authorizationDetails: authorization_details,
        requestUri: null,
        shortCode,
        expiresAt,
        grant_ID: grantId || null,
      }).returning('ID');

      return { requestId: request.ID };
    });

    this.on('DecideRequest', async (req) => {
      const { ID, approve, actor } = req.data;
      const request = await SELECT.one.from(AuthorizationRequests, ID);
      if (!request) return req.error(404, 'not_found');

      if (request.status !== 'pending') return { success: false };

      if (!approve) {
        await UPDATE(AuthorizationRequests, ID).with({ status: 'denied' });
        return { success: true };
      }

      // Approve → create or update a Grant
      let grantId = request.grant_ID;
      if (!grantId) {
        const created = await INSERT.into(Grants).entries({
          status: 'active',
          sessionId: request.sessionId,
          subject_ID: null,
        }).returning('ID');
        grantId = created.ID;
      }

      // Persist authorization details rows (type-agnostic as JSON string on ToolGrantAuthorizationDetails)
      // Keep simple: store as one blob on request; production may denormalize

      await UPDATE(AuthorizationRequests, ID).with({ status: 'approved', grant_ID: grantId });
      return { success: true };
    });

    await super.init();
  }
}

export default GrantManagementService;
