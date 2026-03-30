import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import {
  AuthorizationRequests,
  Consents,
  Consent,
  AuthorizationDetailType,
  AuthorizationRequest,
  Grants,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import { AuthorizationDetails } from "#cds-models/sap/scai/grants/GrantsManagementService";
import { isNativeError } from "node:util/types";
import callback from "./handler.callback.tsx";
import { signConsentJWT } from "../jwt/index.js";

type ConsentHandler = cds.CRUDEventHandler.On<Consent, void | Consent | Error>;

function isConsent(
  consent: Promise<void | Consent | Error> | void | Consent | Error
): consent is Consent {
  return !!consent && !isNativeError(consent);
}

export async function POST(
  this: AuthorizationService,
  req: Parameters<ConsentHandler>[0],
  next: Parameters<ConsentHandler>[1]
) {
  console.log("🔐 Consent request:", req.data);
  // Normalize consent payload: ensure request association gets set when request_ID is provided
  if (req.data && req.data.request_ID && !req.data.request) {
    // set the structured association foreign key
    // @ts-ignore - allow setting generated foreign key field
    req.data.request = { ID: req.data.request_ID } as any;
  }

  // Merge form-submitted authorization_details with original PAR request details.
  // The consent form only submits tool checkboxes and type; fields like server,
  // transport, etc. are missing. We restore them from the original request.
  if (req.data.request_ID && req.data.authorization_details) {
    const authRequest = (await this.read(
      AuthorizationRequests,
      req.data.request_ID
    )) as AuthorizationRequest;

    if (authRequest?.access) {
      const formDetails = req.data.authorization_details as any[];
      req.data.authorization_details = authRequest.access.map(
        (original: any, index: number) => {
          const formDetail = formDetails[index] || {};
          // Start with all fields from the original PAR request detail.
          // PAR stores type as `type_code` (association FK), but AuthorizationDetails
          // entity uses plain `type: String` — remap accordingly.
          const { type_code, ...rest } = original;
          const merged: Record<string, unknown> = { ...rest };
          if (type_code) merged.type = type_code;
          // Apply tool selections from the form — normalize "on"/truthy to true.
          // If no tools were checked, clear the tools map (don't keep PAR's null values).
          if (formDetail.tools && typeof formDetail.tools === "object") {
            const normalizedTools: Record<string, boolean> = {};
            for (const [name, value] of Object.entries(formDetail.tools)) {
              normalizedTools[name] = Boolean(value);
            }
            merged.tools = normalizedTools;
          } else if (rest.tools) {
            // MCP type with no tools selected — clear the null-valued PAR tools
            merged.tools = {};
          }
          // Merge form-only fields not present in the original PAR request
          // (e.g., identifier for agent_invocation, which the PAR stores in locations)
          if (formDetail.identifier) {
            merged.identifier = formDetail.identifier;
          }
          // Merge connection_scopes from form (system_connection type)
          if (formDetail.connection_scopes) {
            merged.connection_scopes = Array.isArray(formDetail.connection_scopes)
              ? formDetail.connection_scopes
              : [formDetail.connection_scopes];
          }
          return merged;
        }
      );
    }
  }

  req.data.previous_consent = await getPreviousConsent(
    this,
    req.data.grant_id || ""
  );
  console.log("🔐 Creating consent:", req.data);

  const consent = await next(req);
  if (isConsent(consent)) {
    const request = (await this.read(
      AuthorizationRequests,
      consent.request_ID!
    )) as AuthorizationRequest;

    const userUuid = req.data.subject_uuid ||
      (cds.context?.user?.authInfo?.token?.payload?.user_uuid as string | undefined);

    // Fire webhook if configured (fire-and-forget, doesn't block consent response)
    if (request?.webhook_uri) {
      const webhookJwt = await signConsentJWT({
        sub: req.data.subject || cds.context?.user?.id || "",
        sub_uuid: userUuid,
        user_uuid: userUuid,
        grant_id: consent.grant_id!,
        actor: request.requested_actor || "",
        event: "grant_approved",
      });
      fetch(request.webhook_uri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ webhook_token: webhookJwt }),
      }).catch(err => console.warn("[webhook] call failed:", err));
    }

    // For system_connection: check if we need JWT proof-of-consent redirect
    const consentDetails = await cds.run(
      cds.ql.SELECT.from(AuthorizationDetails).where({ consent_ID: consent.ID })
    );
    const sysConn = consentDetails.find((d: any) => d.type === "system_connection");

    if (sysConn && request?.redirect_uri && request.redirect_uri !== "urn:scai:grant:callback") {
      // Collect all granted scopes for this system across all consents
      const allSysConnDetails = await cds.run(
        cds.ql.SELECT.from(AuthorizationDetails).where({
          consent_grant_id: consent.grant_id,
          type: "system_connection",
          system: sysConn.system,
        })
      );
      const allScopes = [...new Set(
        allSysConnDetails.flatMap((d: any) => d.connection_scopes || [])
      )];

      const jwt = await signConsentJWT({
        sub: req.data.subject || cds.context?.user?.id || "",
        sub_uuid: userUuid,
        grant_id: consent.grant_id!,
        actor: request.requested_actor || "",
        system: sysConn.system || "",
        scopes: allScopes as string[],
        provider_url: sysConn.provider_url || "",
      });

      const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `<html><body>
<form id="consent-redirect" method="POST" action="${escHtml(request.redirect_uri)}">
<input type="hidden" name="consent_token" value="${escHtml(jwt)}" />
<input type="hidden" name="code" value="${escHtml(consent.request_ID!)}" />
${request.state ? `<input type="hidden" name="state" value="${escHtml(request.state)}" />` : ""}
<noscript><p>Consent granted. <button type="submit">Click to continue</button></p></noscript>
</form>
<script>document.getElementById("consent-redirect").submit();</script>
</body></html>`;

      // @ts-ignore
      cds.context?.http?.res.setHeader("Content-Type", "text/html");
      // @ts-ignore
      cds.context?.http?.res.send(html);
      return;
    }

    // Check if redirect_uri is the default callback URN
    if (request?.redirect_uri === "urn:scai:grant:callback") {
      // Render callback success page directly instead of redirecting
      return await callback.call(this, req);
    } else {
      //@ts-ignore
      cds.context?.http?.res.redirect(
        301,
        `${request?.redirect_uri}?code=${consent.request_ID}`
      );
      return;
    }
  }
  return consent;
}

async function getPreviousConsent(srv: AuthorizationService, grant_id: string) {
  const previousConsents = await srv.run(
    cds.ql.SELECT.from(Consents)
      .where({ grant_id })
      .orderBy("createdAt desc")
      .limit(1)
  );

  return previousConsents[0];
}
