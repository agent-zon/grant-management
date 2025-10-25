import cds from "@sap/cds";
import type { GrantsManagementService } from "./grant-management.tsx";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";

export async function DELETE(this: GrantsManagementService, req: cds.Request) {
  const grant = await this.upsert({
    id: req.data.id,
    revoked_by: req.user,
    revoked_at: new Date(),
  }).into(Grants);

  if (cds.context?.http?.req.accepts("html")) {
    return cds.context?.http?.res.redirect(`/grants-management/Grants`);
  }
  return grant;
}
