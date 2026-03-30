import cds from "@sap/cds";

/**
 * GET /grants/actors() — distinct requested_actor from AuthorizationRequests for act-as autocomplete.
 * Returns { actors: string[] }.
 */
export default async function actors(_req: cds.Request) {
  const rows = await cds.run(
    cds.ql.SELECT.from("sap.scai.grants.AuthorizationRequests").columns("requested_actor")
  );
  const actors = [
    ...new Set(
      (Array.isArray(rows) ? rows : [rows])
        .map((r: { requested_actor?: string }) => r?.requested_actor)
        .filter(Boolean) as string[]
    ),
  ].sort();
  return { actors };
}
