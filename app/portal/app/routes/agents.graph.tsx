import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { GraphNode } from "../components/graph/graph-types";
import "@xyflow/react/dist/style.css";
import { Form, useLoaderData, useSearchParams, useRevalidator } from "react-router";
import type { Route } from "./+types/agents.graph";
import type {
  ApiGrant,
  FindingInfo,
  LeafResource,
  LeafNodeData,
  TraceStepNodeData,
} from "../components/graph/graph-types";
import {
  transformGrantsToGraph,
  buildTraceLayout,
  getTypeColor,
  type TraceSelection,
} from "../components/graph/graph-utils";
import { AgentNode } from "../components/graph/AgentNode";
import { LeafNode } from "../components/graph/LeafNode";
import { TraceStepNode } from "../components/graph/TraceStepNode";
import { DetailPanel } from "../components/graph/DetailPanel";
import { FindingsBubble } from "../components/graph/FindingsBubble";
import { FindingEdge } from "../components/graph/FindingEdge";
import { Network } from "lucide-react";

// ── Loader ────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Permissions — Agent Grants" },
    {
      name: "description",
      content: "Visualize agent access and authorization graph",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const selectedActor = url.searchParams.get("actor") || null;

  // SSR loader fetches from the CDS backend directly (not url.origin which is the portal Express server)
  const cdsBase = process.env.CDS_URL || "http://localhost:4004";
  const apiUrl = selectedActor
    ? `${cdsBase}/grants-management/agentGraph(actor='${encodeURIComponent(selectedActor)}')`
    : `${cdsBase}/grants-management/agentGraph()`;

  try {
    // Forward the Authorization header from the incoming request (set by approuter/IAS).
    const incomingAuth = request.headers.get("Authorization");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (incomingAuth) {
      headers.Authorization = incomingAuth;
    }
    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      console.error("agentGraph fetch failed:", res.status, res.statusText);
      return { actors: [] as string[], selectedActor, grants: [] as ApiGrant[], findings: [] as FindingInfo[] };
    }

    const data = await res.json();
    // The CDS function returns a JSON string wrapped in { value: "..." }
    const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data;

    return {
      actors: (parsed.actors ?? []) as string[],
      selectedActor: parsed.selectedActor ?? selectedActor,
      grants: (parsed.grants ?? []) as ApiGrant[],
      findings: (parsed.findings ?? []) as FindingInfo[],
    };
  } catch (err) {
    console.error("agentGraph loader error:", err);
    return { actors: [] as string[], selectedActor, grants: [] as ApiGrant[], findings: [] as FindingInfo[] };
  }
}

// ── Custom node type map ──────────────────────────────────────────────────────

const nodeTypes = {
  agentNode: AgentNode,
  leafNode: LeafNode,
  traceStepNode: TraceStepNode,
};

const edgeTypes = {
  findingEdge: FindingEdge,
};

// ── Page Component ────────────────────────────────────────────────────────────

export default function AgentsGraphPage() {
  const { actors, selectedActor, grants, findings } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const selectionsRef = useRef<Map<string, TraceSelection>>(new Map());
  const [panelLeaves, setPanelLeaves] = useState<LeafResource[]>([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const animFrameRef = useRef(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const initialViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const revalidator = useRevalidator();

  // WebSocket: live graph updates (goes through approuter → portal WS hub → CDS events)
  useEffect(() => {
    if (!selectedActor || typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/portal/ws/graph?actor=${encodeURIComponent(selectedActor)}`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onmessage = () => revalidator.revalidate();
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
    }
    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [selectedActor]);

  const graphData = useMemo(() => {
    if (!selectedActor || grants.length === 0) return null;
    return transformGrantsToGraph(selectedActor, grants, findings);
  }, [selectedActor, grants, findings]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    graphData?.nodes ?? []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    graphData?.edges ?? []
  );

  // Keep a live ref so handlers always read the latest positions
  nodesRef.current = nodes;
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const newNodeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!graphData) return;
    const prevIds = prevNodeIdsRef.current;
    const newIds = new Set(graphData.nodes.map((n) => n.id));

    if (prevIds.size === 0) {
      // Initial load — set directly, no animation
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
    } else {
      // Update — find new nodes and animate
      const freshIds = new Set<string>();
      for (const id of newIds) {
        if (!prevIds.has(id)) freshIds.add(id);
      }
      newNodeIdsRef.current = freshIds;

      // Mark new nodes with data flag for CSS pop animation
      const markedNodes = graphData.nodes.map((n) =>
        freshIds.has(n.id) ? { ...n, data: { ...n.data, isNew: true } } : n
      );

      setEdges(graphData.edges);
      animatePositions(nodesRef.current, markedNodes, 450, () => {
        // Clear isNew flag after animation completes
        setTimeout(() => {
          newNodeIdsRef.current = new Set();
          setNodes((prev) =>
            prev.map((n) => n.data?.isNew ? { ...n, data: { ...n.data, isNew: false } } : n)
          );
        }, 500);
      });
    }

    prevNodeIdsRef.current = newIds;
    selectionsRef.current = new Map();
    setPanelLeaves([]);
  }, [graphData, setNodes, setEdges, animatePositions]);

  // Cancel running animation on unmount
  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  /** Interpolate node positions from `from` → `to` over `duration` ms.
   *  Edges must be set separately — they follow positions automatically. */
  const animatePositions = useCallback(
    (
      from: GraphNode[],
      to: GraphNode[],
      duration: number,
      onComplete?: () => void
    ) => {
      cancelAnimationFrame(animFrameRef.current);

      const fromMap = new Map(from.map((n) => [n.id, n.position]));
      const toIds = new Set(to.map((n) => n.id));

      // Agent position in each layout — origin for appearing / disappearing nodes
      const toAgent = to.find((n) => n.id === "agent-center");
      const fromAgent = from.find((n) => n.id === "agent-center");
      const agentTo = toAgent?.position ?? { x: 0, y: 0 };
      const agentFrom = fromAgent?.position ?? { x: 0, y: 0 };

      const start = performance.now();

      function frame(now: number) {
        const rawT = Math.min((now - start) / duration, 1);
        // ease-out cubic
        const t = 1 - Math.pow(1 - rawT, 3);

        const result: GraphNode[] = [];

        for (const node of to) {
          const fp = fromMap.get(node.id);
          if (fp) {
            // Existing node — interpolate position
            result.push({
              ...node,
              position: {
                x: fp.x + (node.position.x - fp.x) * t,
                y: fp.y + (node.position.y - fp.y) * t,
              },
            });
          } else {
            // New node (trace steps during expand) — emerge from agent
            result.push({
              ...node,
              position: {
                x: agentTo.x + (node.position.x - agentTo.x) * t,
                y: agentTo.y + (node.position.y - agentTo.y) * t,
              },
            });
          }
        }

        // Disappearing nodes (trace steps during collapse) — slide toward agent
        for (const fromNode of from) {
          if (!toIds.has(fromNode.id)) {
            const fp = fromNode.position;
            result.push({
              ...fromNode,
              position: {
                x: fp.x + (agentFrom.x - fp.x) * t,
                y: fp.y + (agentFrom.y - fp.y) * t,
              },
            });
          }
        }

        setNodes(result);

        if (rawT < 1) {
          animFrameRef.current = requestAnimationFrame(frame);
        } else {
          setNodes(to);
          onComplete?.();
        }
      }

      animFrameRef.current = requestAnimationFrame(frame);
    },
    [setNodes]
  );

  /**
   * Fit the viewport to all current nodes.
   * When `panelOpen` is true, checks whether the right-side detail panel
   * would overlap the graph and shifts left only as much as needed.
   * On wide screens where there's no overlap the graph stays centred.
   */
  const fitViewSmart = useCallback((panelOpen: boolean) => {
    const instance = rfInstance.current;
    const container = flowRef.current;
    if (!instance || !container) return;

    const allNodes = instance.getNodes();
    if (allNodes.length === 0) return;

    const rect = container.getBoundingClientRect();
    const viewW = rect.width;
    const viewH = rect.height;

    // Bounding box in flow coordinates
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of allNodes) {
      const w = node.measured?.width ?? (node.type === "agentNode" ? 130 : node.type === "traceStepNode" ? 220 : 260);
      const h = node.measured?.height ?? (node.type === "agentNode" ? 130 : 80);
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + w);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + h);
    }

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    if (graphW <= 0 || graphH <= 0) return;

    const PADDING = panelOpen ? 0.12 : 0.3;
    const paddedW = viewW * (1 - 2 * PADDING);
    const paddedH = viewH * (1 - 2 * PADDING);
    const zoom = Math.max(0.2, Math.min(paddedW / graphW, paddedH / graphH, 1.0));

    // Start with a centred viewport
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    let vpX = viewW / 2 - graphCenterX * zoom;
    const vpY = viewH / 2 - graphCenterY * zoom;

    if (panelOpen) {
      const PANEL_WIDTH = 400;
      const MARGIN = 24;
      const graphRightScreen = vpX + maxX * zoom;
      const panelLeftScreen = viewW - PANEL_WIDTH;
      const overlap = graphRightScreen - (panelLeftScreen - MARGIN);

      if (overlap > 0) {
        // Don't push the left edge of the graph off-screen
        const graphLeftScreen = vpX + minX * zoom;
        const maxShift = Math.max(0, graphLeftScreen - MARGIN);
        vpX -= Math.min(overlap, maxShift);
      }
    }

    instance.setViewport({ x: vpX, y: vpY, zoom }, { duration: 200 });
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "leafNode" && graphData) {
        const leaf = (node.data as LeafNodeData).leaf;

        // Toggle selection
        const next = new Map(selectionsRef.current);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.set(node.id, { leaf, nodeId: node.id });
        }
        selectionsRef.current = next;

        // CSS class for opacity fade on dimmed nodes/edges
        flowRef.current?.classList.add("trace-animating");
        setTimeout(
          () => flowRef.current?.classList.remove("trace-animating"),
          400
        );

        if (next.size > 0) {
          setPanelLeaves(Array.from(next.values()).map((s) => s.leaf));
          setPanelCollapsed(false);

          const selectionsArray = Array.from(next.values());
          const { nodes: targetNodes, edges: targetEdges } = buildTraceLayout(
            graphData.nodes,
            graphData.edges,
            selectionsArray
          );

          setEdges(targetEdges);
          animatePositions(nodesRef.current, targetNodes, 350, () => {
            fitViewSmart(true);
          });
        } else {
          // All deselected — restore original layout
          setPanelLeaves([]);
          setPanelCollapsed(false);

          setEdges(graphData.edges);
          animatePositions(nodesRef.current, graphData.nodes, 350, () => {
            if (initialViewportRef.current) {
              rfInstance.current?.setViewport(initialViewportRef.current, { duration: 200 });
            }
          });
        }
      }
    },
    [graphData, setEdges, animatePositions, fitViewSmart]
  );

  const closePanel = useCallback(() => {
    selectionsRef.current = new Map();
    setPanelLeaves([]);
    setPanelCollapsed(false);

    flowRef.current?.classList.add("trace-animating");
    setTimeout(
      () => flowRef.current?.classList.remove("trace-animating"),
      400
    );

    if (graphData) {
      setEdges(graphData.edges);
      animatePositions(nodesRef.current, graphData.nodes, 350, () => {
        if (initialViewportRef.current) {
          rfInstance.current?.setViewport(initialViewportRef.current, { duration: 200 });
        }
      });
    }
  }, [graphData, setEdges, animatePositions]);

  // Focus both leaves involved in a finding (edge click)
  const focusFindingLeaves = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      if (!graphData) return;

      const srcNode = graphData.nodes.find((n) => n.id === sourceNodeId);
      const tgtNode = graphData.nodes.find((n) => n.id === targetNodeId);
      if (!srcNode || !tgtNode) return;

      const srcLeaf = (srcNode.data as LeafNodeData).leaf;
      const tgtLeaf = (tgtNode.data as LeafNodeData).leaf;

      const next = new Map<string, TraceSelection>();
      next.set(sourceNodeId, { leaf: srcLeaf, nodeId: sourceNodeId });
      next.set(targetNodeId, { leaf: tgtLeaf, nodeId: targetNodeId });
      selectionsRef.current = next;

      setPanelLeaves([srcLeaf, tgtLeaf]);
      setPanelCollapsed(false);

      flowRef.current?.classList.add("trace-animating");
      setTimeout(
        () => flowRef.current?.classList.remove("trace-animating"),
        400
      );

      const selectionsArray = Array.from(next.values());
      const { nodes: targetNodes, edges: targetEdges } = buildTraceLayout(
        graphData.nodes,
        graphData.edges,
        selectionsArray
      );

      setEdges(targetEdges);
      animatePositions(nodesRef.current, targetNodes, 350, () => {
        fitViewSmart(true);
      });
    },
    [graphData, setEdges, animatePositions, fitViewSmart]
  );

  // Click on the dashed finding edge path
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { type?: string; source: string; target: string }) => {
      if (edge.type === "findingEdge") {
        focusFindingLeaves(edge.source, edge.target);
      }
    },
    [focusFindingLeaves]
  );

  // Listen for label clicks dispatched from FindingEdge
  useEffect(() => {
    const handler = (e: Event) => {
      const { sourceNodeId, targetNodeId } = (e as CustomEvent).detail;
      focusFindingLeaves(sourceNodeId, targetNodeId);
    };
    document.addEventListener("focusFindingLeaves", handler);
    return () => document.removeEventListener("focusFindingLeaves", handler);
  }, [focusFindingLeaves]);

  // Capture initial viewport after graph data changes (including first mount).
  // React Flow's fitView prop handles the first fit; this effect also re-fits
  // when the user switches agents and captures the viewport for unfocus restore.
  useEffect(() => {
    if (!graphData) return;

    const timer = setTimeout(() => {
      const instance = rfInstance.current;
      if (!instance) return;

      // Re-fit (handles agent switch; on first mount this mirrors the fitView prop)
      instance.fitView({ padding: 0.3, maxZoom: 1.0 });

      // Capture after fitView animation settles
      setTimeout(() => {
        if (selectionsRef.current.size === 0) {
          initialViewportRef.current = instance.getViewport();
        }
      }, 250);
    }, 150);

    return () => clearTimeout(timer);
  }, [graphData]);

  return (
    <div
      className="horizon-theme"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0070f2, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Network size={20} color="#ffffff" strokeWidth={1.8} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#131e29",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Agent Permissions
            </h1>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              Authorization graph view
            </p>
          </div>
        </div>

        <Form
          method="get"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <label
            htmlFor="actor-select"
            style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}
          >
            Agent
          </label>
          <select
            id="actor-select"
            name="actor"
            defaultValue={selectedActor ?? ""}
            onChange={(e) => e.target.form?.submit()}
            style={{
              fontSize: 13,
              padding: "6px 32px 6px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#131e29",
              minWidth: 200,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">Select an agent...</option>
            {actors.map((actor) => (
              <option key={actor} value={actor}>
                {actor.replace(/^urn:agent:/, "")}
              </option>
            ))}
          </select>
        </Form>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative", background: "#f5f6f7" }}>
        {!selectedActor || grants.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Network size={32} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#131e29",
                  margin: "0 0 4px 0",
                }}
              >
                Select an agent
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                Choose an agent from the dropdown to visualize its permissions
                graph.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div ref={flowRef} style={{ width: "100%", height: "100%" }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={closePanel}
                onInit={(instance) => { rfInstance.current = instance; }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#d1d5db" gap={20} size={1} />
                <Controls
                  showInteractive={false}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                />
                <MiniMap
                  nodeColor={(node) => {
                    if (node.type === "agentNode") return "#0070f2";
                    if (node.type === "leafNode") {
                      const leaf = (node.data as LeafNodeData).leaf;
                      if (leaf.status === "denied") return "#dc2626";
                      return getTypeColor(leaf.sourceDetailType);
                    }
                    if (node.type === "traceStepNode") return getTypeColor((node.data as TraceStepNodeData).leaf.sourceDetailType);
                    return "#e5e7eb";
                  }}
                  maskColor="rgba(245,246,247,0.7)"
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                  }}
                />
              </ReactFlow>
            </div>

            {graphData && graphData.findings.length > 0 && (
              <FindingsBubble
                findings={graphData.findings}
                rightOffset={panelLeaves.length > 0 ? (panelCollapsed ? 36 : 400) : 0}
              />
            )}

            {panelLeaves.length > 0 && (
              <DetailPanel
                leaves={panelLeaves}
                collapsed={panelCollapsed}
                onToggle={() => setPanelCollapsed((c) => !c)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
