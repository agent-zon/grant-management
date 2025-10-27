import cds from "@sap/cds";
import type { GrantsManagementService } from "./grant-management.tsx";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";

export async function DELETE(this: GrantsManagementService, req: cds.Request) {
  // Mark as revoked in DB and return 204 for API clients
  await this.upsert({
    id: req.data.id,
    revoked_by: req.user.id,
    revoked_at: new Date().toISOString(),
    status: "revoked",
  }).into(Grants);

  if (cds.context?.http?.req.accepts("html")) {
    return cds.context?.http?.res.redirect(`/grants-management/Grants`);
  }
  // For API JSON requests: 204 No Content
  if (cds.context?.http?.req.accepts("html") === false) {
    cds.context?.http?.res.status(204).send();
    return;
  }
  return { id: req.data.id } as any;
}
