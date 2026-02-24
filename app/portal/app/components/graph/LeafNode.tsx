import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Zap,
  Database,
  HardDrive,
  Globe,
  Check,
  XCircle,
  TriangleAlert,
} from "lucide-react";
import type { LeafNodeData, LeafType } from "./graph-types";
import { getTypeColor, getLeafTypeLabel } from "./graph-utils";

const leafIcons = {
  mcp_tool: Zap,
  db_table: Database,
  fs_path: HardDrive,
  api_endpoint: Globe,
} as const;

export function LeafNode({ data }: NodeProps) {
  const { leaf, selected, dimmed } = data as LeafNodeData;
  const color = getTypeColor(leaf.sourceDetailType);
  const Icon = leafIcons[leaf.leafType];
  const badge = getLeafTypeLabel(leaf.leafType);
  const isDenied = leaf.status === "denied";

  return (
    <div
      data-testid="leaf-node"
      style={{
        background: isDenied
          ? "#fef2f2"
          : selected
            ? `${color}0a`
            : "#ffffff",
        border: `1px solid ${selected ? color : isDenied ? "#fca5a5" : leaf.finding ? "#fbbf24" : "#e5e7eb"}`,
        borderLeft: leaf.finding ? "3px solid #f59e0b" : undefined,
        borderRadius: 12,
        padding: "10px 14px",
        width: 260,
        boxShadow: selected
          ? `0 2px 12px ${color}22`
          : "0 1px 4px rgba(0,0,0,0.06)",
        cursor: "pointer",
        opacity: dimmed ? 0.35 : isDenied ? 0.85 : 1,
        transition: "opacity 0.35s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: isDenied ? "#fee2e2" : `${color}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <Icon
            size={15}
            color={isDenied ? "#dc2626" : color}
            strokeWidth={1.8}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isDenied ? "#94a3b8" : "#131e29",
                textDecoration: isDenied ? "line-through" : "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {leaf.label}
            </div>
            <span
              data-testid="type-badge"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color,
                background: `${color}14`,
                padding: "1px 6px",
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              {badge}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {leaf.sublabel}
            </div>
            {isDenied ? (
              <XCircle
                size={14}
                color="#dc2626"
                strokeWidth={2}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <Check
                size={14}
                color="#256f3a"
                strokeWidth={2.5}
                style={{ flexShrink: 0 }}
              />
            )}
          </div>

          {leaf.viaAgent && (
            <div
              style={{
                fontSize: 10,
                color: "#0d7c3d",
                marginTop: 3,
                fontStyle: "italic",
              }}
            >
              via {leaf.viaAgent}
            </div>
          )}

          {leaf.finding && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                fontSize: 10,
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              <TriangleAlert size={11} color="#f59e0b" strokeWidth={2.5} />
              Warning
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      {/* Extra handles for finding edges (right-side routing) */}
      <Handle id="finding-out" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="finding-in" type="target" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
