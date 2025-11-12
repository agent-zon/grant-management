import cds from "@sap/cds";
import type { GrantsManagementService } from "./grant-management.tsx";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";

export async function DELETE(this: GrantsManagementService, req: cds.Request) {
  // Mark as revoked in DB and return 204 for API clients
  await cds.run(
    UPDATE(Grants)
      .set({
        revoked_by: req.user.id,
        revoked_at: new Date().toISOString(),
        status: "revoked",
      })
      .where({ id: req.data.id })
  );

  if (req?.http?.req.accepts("html")) {
    return req?.http?.res.redirect(`/grants-management/Grants`);
  }
  // For API JSON requests: 204 No Content
  if (req?.http?.req.accepts("html") === false) {
    return req?.http?.res.status(204).send({ id: req.data.id });
  }
  return req?.http?.res.status(204).send({ id: req.data.id });
}
