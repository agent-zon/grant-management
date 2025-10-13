import { ulid } from "ulid";
import { AuthorizationService } from "../authorization-service.tsx";

export default function par(srv: AuthorizationService) {
  const { AuthorizationRequests, Grants } = srv.entities;

  srv.on("par", async (req) => {
    //todo:extract subject from token
    //  const {subject_token_type, subject_token} = req.data;
    //  const subject = await cds.auth.authenticate(subject_token_type, subject_token);

    // Generate or use existing grant ID
    const grantId = req.data.grant_id || `gnt_${ulid()}`;
    console.log("🔑 Grant ID for request:", grantId);

    // Create or update grant using upsert (only basic info, no scopes/auth details yet)
    const grant =
      (await srv.read(Grants, grantId)) ||
      (await srv.create(Grants, {
        id: grantId,
      }));
    console.log("🆕 Grant created/updated:", grantId);

    // Create authorization request linked to grant
    const { ID } = await srv
      .insert({
        grant_id: grantId,
        ...req.data,
        access: req.data.authorization_details
          ? parseAuthorizationDetails(req.data.authorization_details)
          : [],
      })
      .into(AuthorizationRequests);

    console.log("Request created", ID);

    req.reply({
      request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
      expires_in: 90,
    });
  });
}

function parseAuthorizationDetails(authorization_details: string) {
  return JSON.parse(authorization_details)
    .filter(Boolean)
    .map(({ type, ...detail }: { type: string; [key: string]: any }) => {
      return {
        type_code: type,
        ...detail,
      };
    });
}
