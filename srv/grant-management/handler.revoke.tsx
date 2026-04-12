import cds from "@sap/cds";
import type { GrantsManagementService } from "./grant-management.tsx";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";
import { emitGraphChange } from "../events/graph-events.js";

export async function DELETE(this: GrantsManagementService, req: cds.Request) {
  // Read grant to get actor before revoking
  const grant = await cds.run(SELECT.one.from(Grants).where({ id: req.data.id }));

  await cds.run(
    UPDATE(Grants)
      .set({
        revoked_by: req.user.id,
        revoked_at: new Date().toISOString(),
        status: "revoked",
      })
      .where({ id: req.data.id })
  );

  // Notify SSE subscribers
  if (grant) {
    emitGraphChange({
      grant_id: req.data.id,
      actor: (grant as any).actor || "",
      event: "grant_revoked",
    });
  }

  if (req?.http?.req.accepts("html")) {
    return req?.http?.res.redirect(`/grants-management/Grants`);
  }
  // For API JSON requests: 204 No Content
  if (req?.http?.req.accepts("html") === false) {
    return req?.http?.res.status(204).send({ id: req.data.id });
  }
  return req?.http?.res.status(204).send({ id: req.data.id });
}
