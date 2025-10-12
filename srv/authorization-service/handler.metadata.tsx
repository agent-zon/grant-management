import { ApplicationService } from "@sap/cds";
import AuthorizationService from "../authorization-service.tsx";

export default function (srv: AuthorizationService) {
  srv.on("metadata", async (req) => {
    console.log("🔐 Metadata request");

    const baseUrl = req.http?.req.baseUrl;

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth-server/authorize`,
      token_endpoint: `${baseUrl}/oauth-server/token`,
      pushed_authorization_request_endpoint: `${baseUrl}/oauth-server/par`,
      authorization_details_types_supported: JSON.stringify([
        "grant_management",
        "file_access",
        "data_access",
        "network_access",
        "mcp-tools",
        "api",
        "database",
        "fs",
      ]),
      grant_types_supported: JSON.stringify([
        "authorization_code",
        "refresh_token",
      ]),
      response_types_supported: JSON.stringify(["code"]),
      code_challenge_methods_supported: JSON.stringify(["S256"]),
    };
  });
}
