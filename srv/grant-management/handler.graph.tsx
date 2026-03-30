/**
 * Agent Graph Handler
 *
 * Returns: { actors[], selectedActor, grants: ApiGrant[], findings: FindingInfo[] }
 *
 * Core algorithm — BFS traversal of user's grants:
 * 1. Fetch all grants for the user (all agents) with authorization_details
 * 2. Group by actor — each actor is an agent node
 * 3. For the selected actor, transform DB → frontend shape
 * 4. Resolve delegations — for each agent_invocation detail:
 *    a. Read identifier (target agent URN)
 *    b. Find the target agent's grants (already loaded in step 1)
 *    c. Include all of the target agent's details as delegated_details[]
 *    d. Mark with viaAgent for graph display
 *    e. Recurse if a matched detail is itself agent_invocation (chaining)
 * 5. Evaluate findings — flatten into leaves, match against FindingRules
 * 6. Return grants + findings
 */

import cds from "@sap/cds";

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolInfo {
  name: string;
  granted: boolean;
}

interface FrontendDetail {
  type: string;
  server?: string;
  transport?: string;
  tools?: ToolInfo[];
  database?: string;
  schema?: string;
  tables?: string[];
  actions?: string[];
  roots?: string[];
  permissions?: Record<string, boolean>;
  urls?: string[];
  protocols?: string[];
  agent?: string;
  description?: string;
  delegated_details?: FrontendDetail[];
}

interface FrontendGrant {
  grant_id: string;
  actor: string;
  granted: boolean;
  scope?: string;
  description?: string;
  granted_at?: string;
  authorization_details: FrontendDetail[];
}

interface FindingConditionInfo {
  side: string;
  leafType?: string;
  labelPattern?: string;
  sublabelPattern?: string;
  requireDelegated?: boolean;
  sourceDetailType?: string;
}

interface FindingInfo {
  findingId: string;
  label: string;
  description: string;
  category?: string;
  severity?: string;
  conditions?: FindingConditionInfo[];
}

// ── Leaf type for finding evaluation ────────────────────────────────────────

interface LeafForEval {
  leafType: string;
  label: string;
  sublabel: string;
  viaAgent?: string;
  sourceDetailType: string;
}

// ── Transform helpers ────────────────────────────────────────────────────────

/** Transform tools from CDS Map to frontend array */
function transformTools(tools: unknown): ToolInfo[] | undefined {
  if (!tools || typeof tools !== "object") return undefined;
  return Object.entries(tools as Record<string, unknown>).map(
    ([name, value]) => ({
      name,
      granted: Boolean(
        value && typeof value === "object" && "essential" in (value as object)
          ? (value as { essential: boolean }).essential
          : value
      ),
    })
  );
}

/** Map backend type codes to frontend type names */
function mapType(backendType: string): string {
  switch (backendType) {
    case "mcp":
      return "mcp_server";
    case "fs":
      return "file_system";
    default:
      return backendType; // database, api, agent_invocation pass through
  }
}

/** Transform a single DB authorization detail to frontend shape */
function transformDetail(dbDetail: Record<string, unknown>): FrontendDetail {
  const type = mapType(dbDetail.type as string);
  const detail: FrontendDetail = { type };

  switch (dbDetail.type) {
    case "mcp": {
      detail.server = dbDetail.server as string | undefined;
      detail.transport = dbDetail.transport as string | undefined;
      detail.tools = transformTools(dbDetail.tools);
      break;
    }
    case "fs": {
      detail.roots = dbDetail.roots as string[] | undefined;
      // CDS structured types may come as nested object or flat columns
      const perms = dbDetail.permissions as Record<string, boolean> | undefined;
      if (perms && typeof perms === "object") {
        detail.permissions = {
          read: Boolean(perms.read),
          write: Boolean(perms.write),
          execute: Boolean(perms.execute),
          delete: Boolean(perms.delete),
          list: Boolean(perms.list),
          create: Boolean(perms.create),
        };
      } else {
        // Flat column format: permissions_read, permissions_write, etc.
        const hasAny = ["read", "write", "execute", "delete", "list", "create"]
          .some((k) => dbDetail[`permissions_${k}`] != null);
        if (hasAny) {
          detail.permissions = {
            read: Boolean(dbDetail.permissions_read),
            write: Boolean(dbDetail.permissions_write),
            execute: Boolean(dbDetail.permissions_execute),
            delete: Boolean(dbDetail.permissions_delete),
            list: Boolean(dbDetail.permissions_list),
            create: Boolean(dbDetail.permissions_create),
          };
        }
      }
      break;
    }
    case "database": {
      const databases = dbDetail.databases as string[] | undefined;
      const schemas = dbDetail.schemas as string[] | undefined;
      detail.database = databases?.[0];
      detail.schema = schemas?.[0];
      detail.tables = dbDetail.tables as string[] | undefined;
      detail.actions = dbDetail.actions as string[] | undefined;
      break;
    }
    case "api": {
      detail.urls = dbDetail.urls as string[] | undefined;
      detail.protocols = dbDetail.protocols as string[] | undefined;
      detail.actions = dbDetail.actions as string[] | undefined;
      break;
    }
    case "agent_invocation": {
      // identifier is the canonical field; fall back to locations[0] for
      // older records where the consent handler didn't persist identifier
      detail.agent =
        (dbDetail.identifier as string | undefined) ??
        (dbDetail.locations as string[] | undefined)?.[0] ??
        undefined;
      // delegated_details will be resolved later
      detail.delegated_details = [];
      break;
    }
  }

  return detail;
}

// ── FS permissions summary ─────────────────────────────────────────────────

function fsPermsSummary(perms?: Record<string, boolean>): string {
  if (!perms) return "granted";
  const allowed = (["read", "write", "list", "create", "execute", "delete"] as const)
    .filter((k) => perms[k]);
  return allowed.length > 0 ? allowed.join(", ") : "granted";
}

// ── Leaf extraction for finding evaluation ─────────────────────────────────

function extractLeavesForEval(
  details: FrontendDetail[],
  viaAgent?: string
): LeafForEval[] {
  const leaves: LeafForEval[] = [];

  for (const detail of details) {
    const delegated = !!viaAgent;
    const sourceType = delegated ? "agent_invocation" : detail.type;

    switch (detail.type) {
      case "mcp_server": {
        for (const tool of detail.tools ?? []) {
          leaves.push({
            leafType: "mcp_tool",
            label: tool.name,
            sublabel: detail.server ?? "",
            viaAgent,
            sourceDetailType: sourceType,
          });
        }
        break;
      }
      case "database": {
        const schema = detail.schema
          ? `${detail.database}.${detail.schema}`
          : detail.database ?? "";
        for (const table of detail.tables ?? []) {
          leaves.push({
            leafType: "db_table",
            label: table,
            sublabel: `${schema} ${detail.actions?.join(", ") ?? ""}`.trim(),
            viaAgent,
            sourceDetailType: sourceType,
          });
        }
        break;
      }
      case "file_system": {
        const perms = fsPermsSummary(detail.permissions);
        for (const root of detail.roots ?? []) {
          leaves.push({
            leafType: "fs_path",
            label: root,
            sublabel: perms,
            viaAgent,
            sourceDetailType: sourceType,
          });
        }
        break;
      }
      case "api": {
        const methods = detail.actions?.join(", ") ?? "granted";
        for (const url of detail.urls ?? []) {
          let host: string;
          try {
            host = new URL(url).host;
          } catch {
            host = url;
          }
          leaves.push({
            leafType: "api_endpoint",
            label: host,
            sublabel: methods,
            viaAgent,
            sourceDetailType: sourceType,
          });
        }
        break;
      }
      case "agent_invocation": {
        // Recurse into delegated details
        const agentName = detail.agent?.replace(/^urn:agent:/, "");
        if (detail.delegated_details) {
          leaves.push(
            ...extractLeavesForEval(detail.delegated_details, agentName)
          );
        }
        break;
      }
    }
  }

  return leaves;
}

// ── Finding evaluation ──────────────────────────────────────────────────────

function matchCondition(
  leaf: LeafForEval,
  condition: Record<string, unknown>
): boolean {
  const { leafType, labelPattern, sublabelPattern, requireDelegated, sourceDetailType } = condition;

  if (leafType && leaf.leafType !== leafType) return false;

  if (labelPattern) {
    const pattern = String(labelPattern);
    if (leaf.label !== pattern && !leaf.label.includes(pattern)) return false;
  }

  if (sublabelPattern) {
    const pattern = String(sublabelPattern);
    if (!leaf.sublabel.includes(pattern)) return false;
  }

  if (requireDelegated === true && !leaf.viaAgent) return false;

  if (sourceDetailType && leaf.sourceDetailType !== sourceDetailType) return false;

  return true;
}

function evaluateFindings(
  leaves: LeafForEval[],
  rules: Array<Record<string, unknown>>
): FindingInfo[] {
  const findings: FindingInfo[] = [];

  for (const rule of rules) {
    if (rule.active === false) continue;

    const conditions = (rule.conditions as Array<Record<string, unknown>>) ?? [];
    const sideA = conditions.filter((c) => c.side === "A");
    const sideB = conditions.filter((c) => c.side === "B");

    // SoD rules: both sides must match
    if (sideA.length > 0 && sideB.length > 0) {
      const matchesA = leaves.some((leaf) =>
        sideA.some((cond) => matchCondition(leaf, cond))
      );
      const matchesB = leaves.some((leaf) =>
        sideB.some((cond) => matchCondition(leaf, cond))
      );

      if (matchesA && matchesB) {
        findings.push({
          findingId: rule.code as string,
          label: rule.label as string,
          description: rule.description as string,
          category: rule.category as string | undefined,
          severity: rule.severity as string | undefined,
          conditions: conditions.map((c) => ({
            side: c.side as string,
            leafType: c.leafType as string | undefined,
            labelPattern: c.labelPattern as string | undefined,
            sublabelPattern: c.sublabelPattern as string | undefined,
            requireDelegated: c.requireDelegated as boolean | undefined,
            sourceDetailType: c.sourceDetailType as string | undefined,
          })),
        });
      }
    }
    // Single-side rules (excessive_privilege): just side A
    else if (sideA.length > 0 && sideB.length === 0) {
      const matchesA = leaves.some((leaf) =>
        sideA.some((cond) => matchCondition(leaf, cond))
      );
      if (matchesA) {
        findings.push({
          findingId: rule.code as string,
          label: rule.label as string,
          description: rule.description as string,
          category: rule.category as string | undefined,
          severity: rule.severity as string | undefined,
          conditions: conditions.map((c) => ({
            side: c.side as string,
            leafType: c.leafType as string | undefined,
            labelPattern: c.labelPattern as string | undefined,
            sublabelPattern: c.sublabelPattern as string | undefined,
            requireDelegated: c.requireDelegated as boolean | undefined,
            sourceDetailType: c.sourceDetailType as string | undefined,
          })),
        });
      }
    }
  }

  return findings;
}

// ── Grant query builder ──────────────────────────────────────────────────────

function grantsQuery(db: any) {
  const { Grants } = db.entities("sap.scai.grants");
  return SELECT.from(Grants).columns((g: any) => {
    g.id,
      g.status,
      g.scope,
      g.subject,
      g.actor,
      g.consents((c: any) => {
        c.grant_id,
          c.actor,
          c.request((r: any) => {
            r.requested_actor;
          }),
          c.authorization_details((d: any) => {
            d("*"), d.locations, d.actions, d.tools,
            d.roots, d.databases, d.schemas, d.tables,
            d.urls, d.protocols, d.privileges, d.resources;
          });
      });
  });
}

// ── Shared graph builder ─────────────────────────────────────────────────────

interface FlatGrant {
  grant: Record<string, unknown>;
  actor: string;
  details: Record<string, unknown>[];
}

async function buildGraph(
  allGrants: Array<Record<string, unknown>>,
  selectedActor: string | undefined
) {
  const db = cds.db;
  const { FindingRules } = db.entities("sap.scai.grants");

  // Flatten: each grant → actor(s) from consents
  const flatGrants: FlatGrant[] = [];
  for (const grant of allGrants) {
    const consents = (grant as any).consents ?? [];
    for (const consent of consents) {
      const actor =
        consent.actor ?? consent.request?.requested_actor ?? (grant as any).actor ?? "unknown";
      const details = consent.authorization_details ?? [];
      flatGrants.push({ grant, actor, details });
    }
  }

  const actorSet = new Set(flatGrants.map((fg) => fg.actor));
  const actors = Array.from(actorSet).sort();

  if (!selectedActor) {
    return { actors, selectedActor: null, grants: [], findings: [] };
  }

  // Build per-actor detail index (for delegation resolution)
  const actorDetailIndex = new Map<string, Array<Record<string, unknown>>>();
  for (const fg of flatGrants) {
    if (!actorDetailIndex.has(fg.actor)) {
      actorDetailIndex.set(fg.actor, []);
    }
    for (const detail of fg.details) {
      actorDetailIndex.get(fg.actor)!.push(detail);
    }
  }

  // Transform selected actor's grants to frontend shape + resolve delegations
  const selectedFlat = flatGrants.filter((fg) => fg.actor === selectedActor);
  const frontendGrants: FrontendGrant[] = [];
  const visited = new Set<string>();

  function resolveDelegation(
    detail: FrontendDetail,
    dbDetail: Record<string, unknown>,
    depth: number
  ): void {
    if (detail.type !== "agent_invocation" || depth > 10) return;

    const targetAgent =
      (dbDetail.identifier as string | undefined) ??
      (dbDetail.locations as string[] | undefined)?.[0];
    if (!targetAgent) return;

    if (visited.has(targetAgent)) return;
    visited.add(targetAgent);

    const targetDetails = actorDetailIndex.get(targetAgent) ?? [];
    const delegated: FrontendDetail[] = [];

    for (const tgtDetail of targetDetails) {
      const transformed = transformDetail(tgtDetail);
      if ((tgtDetail as any).type === "agent_invocation") {
        resolveDelegation(transformed, tgtDetail, depth + 1);
      }
      delegated.push(transformed);
    }

    visited.delete(targetAgent);
    detail.delegated_details = delegated;
    detail.agent = targetAgent;
    detail.description =
      (dbDetail as any).description ?? `Delegated invocation of ${targetAgent}`;
  }

  for (const fg of selectedFlat) {
    const grantDetails: FrontendDetail[] = [];

    for (const dbDetail of fg.details) {
      const transformed = transformDetail(dbDetail);
      if ((dbDetail as any).type === "agent_invocation") {
        visited.clear();
        resolveDelegation(transformed, dbDetail, 0);
      }
      grantDetails.push(transformed);
    }

    frontendGrants.push({
      grant_id: (fg.grant as any).id,
      actor: fg.actor,
      granted: (fg.grant as any).status === "active",
      scope: (fg.grant as any).scope ?? undefined,
      description: undefined,
      granted_at: (fg.grant as any).createdAt ?? undefined,
      authorization_details: grantDetails,
    });
  }

  // Evaluate findings
  const allDetails = frontendGrants.flatMap((g) => g.authorization_details);
  const leaves = extractLeavesForEval(allDetails);

  const findingRules = await SELECT.from(FindingRules).columns((r: any) => {
    r("*"), r.conditions((c: any) => c("*"));
  });

  const findings = evaluateFindings(
    leaves,
    findingRules as Array<Record<string, unknown>>
  );

  return { actors, selectedActor, grants: frontendGrants, findings };
}

// ── User view ────────────────────────────────────────────────────────────────
// Actors dropdown: only agents that the current user granted permissions to.
// Selected actor: only grants from the current user (subject).

export async function GRAPH(req: cds.Request) {
  const selectedActor = req.data?.actor as string | undefined;
  const callerUuid = cds.context?.user?.authInfo?.token?.payload?.user_uuid as string | undefined;
  const callerEmail = (cds.context?.user?.authInfo?.token?.payload?.mail ?? cds.context?.user?.authInfo?.token?.payload?.email) as string | undefined;
  const callerId = req.user.id;
  const ids = [callerUuid, callerId, callerEmail].filter(Boolean) as string[];
  const allGrants = await grantsQuery(cds.db).where`subject_uuid in ${ids} or subject in ${ids}`;
  return JSON.stringify(await buildGraph(allGrants, selectedActor));
}

// ── Admin view ───────────────────────────────────────────────────────────────
// Actors dropdown: ALL agents across all resource owners.
// Selected actor: ALL grants for that actor from every resource owner.
// Protected by @requires: 'grant_admin' in CDS.

export async function ADMIN_GRAPH(req: cds.Request) {
  const selectedActor = req.data?.actor as string | undefined;

  if (!selectedActor) {
    // No actor selected — return all known actors from all grants
    const allGrants = await grantsQuery(cds.db);
    return JSON.stringify(await buildGraph(allGrants, undefined));
  }

  // Fetch all grants where this actor is the agent — across all subjects
  const allGrants = await grantsQuery(cds.db).where({ actor: selectedActor });
  return JSON.stringify(await buildGraph(allGrants, selectedActor));
}
