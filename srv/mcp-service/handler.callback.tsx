import cds from "@sap/cds";
import McpProxyService from "./mcp-service";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import { render } from "#cds-ssr";

export default async function (
  this: McpProxyService,
  req: cds.Request<{
    code: string;
    code_verifier: string;
    redirect_uri: string;
  }>
) {
  const { code, code_verifier, redirect_uri } = req.data;

  try {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const tokenResponse: any = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "devops-bot",
      code,
      code_verifier,
      redirect_uri,
    });

    return render(req,
      <div className="m2 bg-light p-4 ">
        <h2>Authorization Successful</h2>
        <pre>{JSON.stringify(tokenResponse, null, 2)}</pre>
      </div>
    );
  } catch (error) {
    console.error("Error during token exchange:", error);
    return render(req,
      <div className="callback-error">
        <h2>Authorization Failed</h2>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }
}
