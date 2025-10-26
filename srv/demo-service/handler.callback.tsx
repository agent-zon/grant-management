import type { DemoService } from "./demo-service.tsx";
import {Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";
import cds from "@sap/cds";
import {renderToString} from "react-dom/server";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";

export async function CALLBACK(this:DemoService ,req: cds.Request<{code: string; code_verifier: string; redirect_uri: string;}>) {
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

        // Get grant_id from token response
        const grant_id = tokenResponse.grant_id;
        return  req.http?.res.redirect(`/demo/devops_bot/shell?grant_id=${grant_id}`);
        // // Use HTMX headers to navigate back to shell
        // cds.context?.http?.res.setHeader("Content-Type", "text/html");
        // cds.context?.http?.res.setHeader("HX-Trigger", "grant-updated");
        // cds.context?.http?.res.setHeader("HX-Location", `/demo/devops_bot/shell?grant_id=${grant_id}`);
        // cds.context?.http?.res.setHeader("HX-Push-Url", `/demo/devops_bot/shell?grant_id=${grant_id}`);
        //
        // return cds.context?.http?.res.send(
        //     renderToString(
        //         <div className="space-y-4">
        //             <h3 className="text-lg font-bold text-green-400">✅ Authorization Complete</h3>
        //             <div className="bg-gray-900 rounded p-4">
        //       <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
        //         {JSON.stringify(tokenResponse, null, 2)}
        //       </pre>
        //             </div>
        //             <div className="text-sm text-gray-400">
        //                 Redirecting to shell...
        //             </div>
        //         </div>
        //     )
        // );
    } catch (e) {
        return this.renderError(e);
    }
}
  