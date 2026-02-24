import type {
  ApiGrant,
  AuthorizationDetail,
  AuthorizationDetailType,
  ResourceAuthorizationDetail,
  AgentInvocationAuthorizationDetail,
  LeafResource,
  LeafGroup,
  LeafType,
  LeafNodeData,
  FindingInfo,
  GraphData,
  GraphNode,
  GraphEdge,
} from "./graph-types";

// ── Layout constants ─────────────────────────────────────────────────────────

const COL_GAP = 400;
const ROW_GAP = 88;
const GROUP_SEPARATOR = 28;

// ── Colors & labels ──────────────────────────────────────────────────────────

export function getTypeColor(type: AuthorizationDetailType): string {
  switch (type) {
    case "mcp_server":
      return "#e76500";
    case "file_system":
      return "#aa0808";
    case "database":
      return "#8b5cf6";
    case "api":
      return "#0070f2";
    case "agent_invocation":
      return "#0d7c3d";
  }
}

export function getTypeLabel(type: AuthorizationDetailType): string {
  switch (type) {
    case "mcp_server":
      return "MCP";
    case "file_system":
      return "FS";
    case "database":
      return "DB";
    case "api":
      return "API";
    case "agent_invocation":
      return "Agent";
  }
}

export function getLeafTypeLabel(type: LeafType): string {
  switch (type) {
    case "mcp_tool":
      return "MCP";
    case "db_table":
      return "DB";
    case "fs_path":
      return "FS";
    case "api_endpoint":
      return "API";
  }
}

// ── Leaf extraction ─────────────────────────────────────────────────────────

function fsPermissionsSummary(
  permissions?: Record<string, boolean | undefined>
): string {
  if (!permissions) return "granted";
  const allowed = (
    ["read", "write", "list", "create", "execute", "delete"] as const
  ).filter((k) => permissions[k]);
  return allowed.length > 0 ? allowed.join(", ") : "granted";
}

function extractLeavesFromDetail(
  grant: ApiGrant,
  detail: ResourceAuthorizationDetail,
  delegation?: {
    agent: string;
    agentDisplayName: string;
    description?: string;
    invocationDetail: AgentInvocationAuthorizationDetail;
    restrictedDetail: ResourceAuthorizationDetail;
  }
): LeafResource[] {
  const leaves: LeafResource[] = [];
  const viaAgent = delegation?.agentDisplayName;
  const prefix = viaAgent ? `via-${viaAgent}::` : "";

  const traceBase = {
    grant: {
      grant_id: grant.grant_id,
      scope: grant.scope,
      description: grant.description,
      granted_at: grant.granted_at,
      expires_at: grant.expires_at,
    },
    authorizationDetail: delegation
      ? delegation.invocationDetail
      : detail,
    delegation,
  };

  switch (detail.type) {
    case "mcp_server": {
      const tools = detail.tools ?? [];
      for (const tool of tools) {
        leaves.push({
          id: `${prefix}mcp::${detail.server}::${tool.name}`,
          leafType: "mcp_tool",
          label: tool.name,
          sublabel: detail.server,
          status: tool.granted ? "granted" : "denied",
          constraintsSummary: tool.granted ? "granted" : "denied",
          viaAgent,
          sourceDetailType: delegation ? "agent_invocation" : "mcp_server",
          trace: { ...traceBase },
        });
      }
      break;
    }
    case "database": {
      const tables = detail.tables ?? [];
      const actions = detail.actions?.join(", ") ?? "granted";
      const schema = detail.schema
        ? `${detail.database}.${detail.schema}`
        : detail.database;
      for (const table of tables) {
        leaves.push({
          id: `${prefix}db::${detail.database}::${detail.schema ?? ""}::${table}`,
          leafType: "db_table",
          label: table,
          sublabel: schema,
          status: "granted",
          constraintsSummary: actions,
          viaAgent,
          sourceDetailType: delegation ? "agent_invocation" : "database",
          trace: { ...traceBase },
        });
      }
      break;
    }
    case "file_system": {
      const perms = fsPermissionsSummary(
        detail.permissions as Record<string, boolean | undefined> | undefined
      );
      for (const root of detail.roots) {
        leaves.push({
          id: `${prefix}fs::${root}`,
          leafType: "fs_path",
          label: root,
          sublabel: perms,
          status: "granted",
          constraintsSummary: perms,
          viaAgent,
          sourceDetailType: delegation ? "agent_invocation" : "file_system",
          trace: { ...traceBase },
        });
      }
      break;
    }
    case "api": {
      const methods = detail.actions?.join(", ") ?? "granted";
      for (const url of detail.urls) {
        let host: string;
        try {
          host = new URL(url).host;
        } catch {
          host = url;
        }
        leaves.push({
          id: `${prefix}api::${url}`,
          leafType: "api_endpoint",
          label: host,
          sublabel: methods,
          status: "granted",
          constraintsSummary: methods,
          viaAgent,
          sourceDetailType: delegation ? "agent_invocation" : "api",
          trace: { ...traceBase },
        });
      }
      break;
    }
  }

  return leaves;
}

/**
 * Walk every grant → every authorization_detail → emit one leaf per atomic resource.
 */
export function extractLeaves(grants: ApiGrant[]): LeafResource[] {
  const leaves: LeafResource[] = [];

  for (const grant of grants) {
    for (const detail of grant.authorization_details) {
      if (detail.type === "agent_invocation") {
        const agentDisplayName = detail.agent.replace(/^urn:agent:/, "");
        for (const delegatedDetail of detail.delegated_details) {
          leaves.push(
            ...extractLeavesFromDetail(grant, delegatedDetail, {
              agent: detail.agent,
              agentDisplayName,
              description: detail.description,
              invocationDetail: detail,
              restrictedDetail: delegatedDetail,
            })
          );
        }
      } else {
        leaves.push(...extractLeavesFromDetail(grant, detail));
      }
    }
  }

  return leaves;
}

/**
 * Group leaves by leafType in order: mcp_tool → db_table → fs_path → api_endpoint.
 * Within each group: granted first, then denied, alphabetical within each.
 */
export function groupLeaves(leaves: LeafResource[]): LeafGroup[] {
  const order: LeafType[] = ["mcp_tool", "db_table", "fs_path", "api_endpoint"];
  const groups: LeafGroup[] = [];

  for (const leafType of order) {
    const matching = leaves.filter((l) => l.leafType === leafType);
    if (matching.length === 0) continue;

    matching.sort((a, b) => {
      if (a.status !== b.status) return a.status === "granted" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    groups.push({ leafType, leaves: matching });
  }

  return groups;
}

// ── Finding application ──────────────────────────────────────────────────────

/**
 * Apply backend-evaluated findings to leaves.
 * Matches finding conditions against leaf properties to annotate affected leaves.
 */
export function applyFindings(
  leaves: LeafResource[],
  findings: FindingInfo[]
): void {
  for (const finding of findings) {
    if (!finding.conditions?.length) continue;

    const sideA = finding.conditions.filter((c) => c.side === "A");
    const sideB = finding.conditions.filter((c) => c.side === "B");

    const matchesCond = (leaf: LeafResource, cond: { leafType?: string; labelPattern?: string; sublabelPattern?: string; requireDelegated?: boolean; sourceDetailType?: string }) => {
      if (cond.leafType && leaf.leafType !== cond.leafType) return false;
      if (cond.labelPattern && leaf.label !== cond.labelPattern && !leaf.label.includes(cond.labelPattern)) return false;
      if (cond.sublabelPattern && !leaf.sublabel.includes(cond.sublabelPattern)) return false;
      if (cond.requireDelegated && !leaf.viaAgent) return false;
      if (cond.sourceDetailType && leaf.sourceDetailType !== cond.sourceDetailType) return false;
      return true;
    };

    // SoD: both sides must match
    if (sideA.length > 0 && sideB.length > 0) {
      const matchedA = leaves.filter((l) => sideA.some((c) => matchesCond(l, c)));
      const matchedB = leaves.filter((l) => sideB.some((c) => matchesCond(l, c)));
      if (matchedA.length > 0 && matchedB.length > 0) {
        for (const leaf of [...matchedA, ...matchedB]) {
          leaf.finding = finding;
        }
      }
    }
    // Single-side: just side A
    else if (sideA.length > 0) {
      const matchedA = leaves.filter((l) => sideA.some((c) => matchesCond(l, c)));
      for (const leaf of matchedA) {
        leaf.finding = finding;
      }
    }
  }
}

// ── Main graph builder ───────────────────────────────────────────────────────

/**
 * Transform grants for a single actor into React Flow graph data.
 *
 * Layout: left-to-right, 2 columns.
 *   Column 0 (x=0): Agent node
 *   Column 1 (x=400): Leaf nodes, vertically stacked by group with extra gap between groups
 */
export function transformGrantsToGraph(
  actor: string,
  grants: ApiGrant[],
  findings: FindingInfo[] = []
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const leaves = extractLeaves(grants);
  applyFindings(leaves, findings);
  const groups = groupLeaves(leaves);

  const totalLeaves = leaves.length;
  const deniedCount = leaves.filter((l) => l.status === "denied").length;

  // Calculate total height for centering
  let totalHeight = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    totalHeight += (groups[gi].leaves.length - 1) * ROW_GAP;
    if (gi < groups.length - 1) totalHeight += GROUP_SEPARATOR;
  }
  // Also add one ROW_GAP between groups (the last leaf of one group to first leaf of next)
  totalHeight += (groups.length - 1) * ROW_GAP;

  const startY = -totalHeight / 2;

  // Agent node
  const agentId = "agent-center";
  nodes.push({
    id: agentId,
    type: "agentNode",
    position: { x: 0, y: 0 },
    data: {
      label: actor.replace(/^urn:agent:/, ""),
      grantCount: grants.length,
      permissionCount: totalLeaves,
      deniedCount,
    },
  });

  // Leaf nodes
  let currentY = startY;
  let leafIndex = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    for (let li = 0; li < group.leaves.length; li++) {
      const leaf = group.leaves[li];
      const nodeId = `leaf-${leafIndex}`;

      nodes.push({
        id: nodeId,
        type: "leafNode",
        position: { x: COL_GAP, y: currentY },
        data: { leaf, selected: false },
      });

      const color = getTypeColor(leaf.sourceDetailType);
      const isDenied = leaf.status === "denied";

      edges.push({
        id: `edge-${leafIndex}`,
        source: agentId,
        target: nodeId,
        style: {
          stroke: color,
          strokeWidth: 2,
          opacity: isDenied ? 0.5 : 1,
          strokeDasharray: isDenied ? "6 3" : undefined,
        },
      });

      currentY += ROW_GAP;
      leafIndex++;
    }

    // Add extra gap between groups
    if (gi < groups.length - 1) {
      currentY += GROUP_SEPARATOR;
    }
  }

  // Finding edges — connect leaf nodes that share a findingId
  const findingGroups = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.type === "leafNode") {
      const leaf = (node.data as LeafNodeData).leaf;
      if (leaf.finding) {
        const key = leaf.finding.findingId;
        if (!findingGroups.has(key)) findingGroups.set(key, []);
        findingGroups.get(key)!.push(node.id);
      }
    }
  }

  for (const [findingId, nodeIds] of findingGroups) {
    if (nodeIds.length >= 2) {
      const nA = nodes.find((n) => n.id === nodeIds[0])!;
      const nB = nodes.find((n) => n.id === nodeIds[1])!;
      const [upper, lower] =
        nA.position.y < nB.position.y
          ? [nodeIds[0], nodeIds[1]]
          : [nodeIds[1], nodeIds[0]];

      edges.push({
        id: `finding-${findingId}`,
        source: upper,
        target: lower,
        sourceHandle: "finding-out",
        targetHandle: "finding-in",
        type: "findingEdge",
        style: {
          stroke: "#f59e0b",
          strokeWidth: 2,
          strokeDasharray: "6 4",
        },
        label: "\u26A0 SoD Risk",
      });
    }
  }

  // Collect unique findings for the bubble
  const uniqueFindings = new Map<string, FindingInfo>();
  for (const leaf of leaves) {
    if (leaf.finding) {
      uniqueFindings.set(leaf.finding.findingId, leaf.finding);
    }
  }

  return { nodes, edges, findings: Array.from(uniqueFindings.values()) };
}

// ── Trace expansion layout ──────────────────────────────────────────────────

const TRACE_COL_GAP = 300;

export interface TraceSelection {
  leaf: LeafResource;
  nodeId: string;
}

/**
 * Build an expanded trace layout for one or more selected leaves.
 * Each selection gets its own horizontal trace chain (agent → grant → [delegation] → detail → leaf)
 * at a unique y level, centered around y=0.
 * Non-selected leaves are dimmed and pushed above / below the trace region.
 */
export function buildTraceLayout(
  baseNodes: GraphNode[],
  baseEdges: GraphEdge[],
  selections: TraceSelection[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (selections.length === 0) {
    return { nodes: baseNodes, edges: baseEdges };
  }

  const n = selections.length;
  const TRACE_ROW_GAP = 140;

  // 1. For each selection, determine trace steps (use nodeId for stable IDs)
  const selectionData = selections.map((sel) => {
    const steps: Array<{ id: string; stepType: "grant" | "delegation" | "detail" }> = [];
    steps.push({ id: `trace-${sel.nodeId}-grant`, stepType: "grant" });
    if (sel.leaf.trace.delegation) {
      steps.push({ id: `trace-${sel.nodeId}-delegation`, stepType: "delegation" });
    }
    steps.push({ id: `trace-${sel.nodeId}-detail`, stepType: "detail" });
    return { ...sel, steps, totalSteps: steps.length };
  });

  // 2. The widest trace chain determines horizontal extent
  const maxSteps = Math.max(...selectionData.map((s) => s.totalSteps));
  const traceWidth = TRACE_COL_GAP * (maxSteps + 1);
  const collapsedMidX = COL_GAP / 2;
  const agentX = collapsedMidX - traceWidth / 2;
  const leafX = agentX + traceWidth;

  // 3. Build trace step nodes + trace edges for each selection
  const selectedNodeIds = new Set(selections.map((s) => s.nodeId));
  const traceNodes: GraphNode[] = [];
  const traceEdges: GraphEdge[] = [];

  for (let si = 0; si < selectionData.length; si++) {
    const sel = selectionData[si];
    const rowY = (si - (n - 1) / 2) * TRACE_ROW_GAP;

    // Trace step nodes
    for (let i = 0; i < sel.steps.length; i++) {
      const step = sel.steps[i];
      traceNodes.push({
        id: step.id,
        type: "traceStepNode" as const,
        position: { x: agentX + TRACE_COL_GAP * (i + 1), y: rowY },
        data: { stepType: step.stepType, leaf: sel.leaf },
      });
    }

    // Trace edges: agent → steps → leaf
    const chain = ["agent-center", ...sel.steps.map((s) => s.id), sel.nodeId];
    const traceColor = getTypeColor(sel.leaf.sourceDetailType);
    for (let i = 0; i < chain.length - 1; i++) {
      traceEdges.push({
        id: `trace-${sel.nodeId}-edge-${i}`,
        source: chain[i],
        target: chain[i + 1],
        animated: true,
        style: { stroke: traceColor, strokeWidth: 2 },
      });
    }
  }

  // 4. Split non-selected leaves above / below the trace region
  //    Use median y of selected leaves' original positions as the split point
  const selectedOrigYs = selections
    .map((sel) => baseNodes.find((nd) => nd.id === sel.nodeId)?.position.y ?? 0)
    .sort((a, b) => a - b);
  const medianY = selectedOrigYs[Math.floor(selectedOrigYs.length / 2)];

  const aboveLeaves: GraphNode[] = [];
  const belowLeaves: GraphNode[] = [];

  for (const node of baseNodes) {
    if (node.type === "leafNode" && !selectedNodeIds.has(node.id)) {
      if (node.position.y < medianY) {
        aboveLeaves.push(node);
      } else {
        belowLeaves.push(node);
      }
    }
  }

  aboveLeaves.sort((a, b) => a.position.y - b.position.y);
  belowLeaves.sort((a, b) => a.position.y - b.position.y);

  const traceRegionHalfHeight = ((n - 1) / 2) * TRACE_ROW_GAP;
  const PUSH_GAP = 140;
  const LEAF_SPACING = 88;

  // 5. Reposition all base nodes
  const repositionedNodes: GraphNode[] = baseNodes.map((node) => {
    if (node.id === "agent-center") {
      return { ...node, position: { x: agentX, y: 0 } };
    }

    // Selected leaf — position at the correct trace row
    const selIdx = selectionData.findIndex((s) => s.nodeId === node.id);
    if (selIdx >= 0) {
      const rowY = (selIdx - (n - 1) / 2) * TRACE_ROW_GAP;
      return {
        ...node,
        position: { x: leafX, y: rowY },
        data: { ...node.data, selected: true, dimmed: false },
      };
    }

    // Non-selected leaf — push above or below
    if (node.type === "leafNode") {
      const aboveIdx = aboveLeaves.findIndex((nd) => nd.id === node.id);
      let newY: number;

      if (aboveIdx >= 0) {
        const distFromEdge = aboveLeaves.length - 1 - aboveIdx;
        newY = -(traceRegionHalfHeight + PUSH_GAP + distFromEdge * LEAF_SPACING);
      } else {
        const belowIdx = belowLeaves.findIndex((nd) => nd.id === node.id);
        newY = traceRegionHalfHeight + PUSH_GAP + belowIdx * LEAF_SPACING;
      }

      return {
        ...node,
        position: { x: leafX, y: newY },
        data: { ...node.data, selected: false, dimmed: true },
      };
    }

    return node;
  });

  // 6. Dim existing edges (hide edges connected to any selected node)
  const dimmedEdges: GraphEdge[] = baseEdges
    .filter((e) => !selectedNodeIds.has(e.target) && !selectedNodeIds.has(e.source))
    .map((e) => ({
      ...e,
      style: { ...e.style, opacity: 0.1 },
      animated: false,
    }));

  return {
    nodes: [...repositionedNodes, ...traceNodes],
    edges: [...dimmedEdges, ...traceEdges],
  };
}

/**
 * Strip urn:agent: prefix from actor name for display.
 */
export function displayActorName(actor: string): string {
  return actor.replace(/^urn:agent:/, "");
}
