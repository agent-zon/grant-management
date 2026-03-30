import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileKey, Bot, Shield, Zap, Database, HardDrive, Globe } from "lucide-react";
import type { TraceStepNodeData, AuthorizationDetailType } from "./graph-types";
import { getTypeColor } from "./graph-utils";

const detailTypeIcons: Record<
  Exclude<AuthorizationDetailType, "agent_invocation">,
  typeof Zap
> = {
  mcp_server: Zap,
  database: Database,
  file_system: HardDrive,
  api: Globe,
};

const detailTypeLabels: Record<
  Exclude<AuthorizationDetailType, "agent_invocation">,
  string
> = {
  mcp_server: "MCP Server",
  database: "Database",
  file_system: "File System",
  api: "API",
};

export function TraceStepNode({ data }: NodeProps) {
  const { stepType, leaf } = data as TraceStepNodeData;
  const traceColor = getTypeColor(leaf.sourceDetailType);

  let accentColor: string;
  let icon: React.ReactNode;
  let title: string;
  let lines: string[];

  switch (stepType) {
    case "grant": {
      accentColor = "#0070f2";
      icon = <FileKey size={16} color={accentColor} strokeWidth={1.8} />;
      title = "Grant";
      lines = [
        leaf.trace.grant.grant_id,
        leaf.trace.grant.scope ? `scope: ${leaf.trace.grant.scope}` : "",
        leaf.trace.grant.description ?? "",
      ].filter(Boolean);
      break;
    }
    case "delegation": {
      accentColor = "#0d7c3d";
      icon = <Bot size={16} color={accentColor} strokeWidth={1.8} />;
      title = "A2A Delegation";
      const del = leaf.trace.delegation;
      lines = del
        ? [
            `\u2192 ${del.agentDisplayName}`,
            del.description ?? "",
          ].filter(Boolean)
        : [];
      break;
    }
    case "detail": {
      const resourceDetail = leaf.trace.delegation
        ? leaf.trace.delegation.restrictedDetail
        : leaf.trace.authorizationDetail;

      const detailType =
        resourceDetail.type === "agent_invocation"
          ? "mcp_server"
          : resourceDetail.type;

      accentColor = traceColor;
      const DetailIcon = detailTypeIcons[detailType];
      icon = <DetailIcon size={16} color={accentColor} strokeWidth={1.8} />;
      title = detailTypeLabels[detailType];

      lines = buildDetailLines(resourceDetail);
      break;
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid #e5e7eb`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding: "10px 14px",
        width: 220,
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${accentColor}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#131e29" }}>
          {title}
        </div>
      </div>

      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 11,
            color: i === 0 ? "#131e29" : "#6b7280",
            fontWeight: i === 0 ? 600 : 400,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </div>
      ))}

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

function buildDetailLines(
  detail: import("./graph-types").AuthorizationDetail
): string[] {
  switch (detail.type) {
    case "mcp_server": {
      const tools = detail.tools ?? [];
      const granted = tools.filter((t) => t.granted).length;
      return [
        `${detail.server} (${detail.transport ?? "stdio"})`,
        `${tools.length} tools (${granted} granted)`,
      ];
    }
    case "database": {
      const schema = detail.schema
        ? `${detail.database}.${detail.schema}`
        : detail.database;
      const tables = detail.tables ?? [];
      return [schema, `${tables.length} tables \u2014 ${(detail.actions ?? []).join(", ")}`];
    }
    case "file_system": {
      const perms = ["read", "write", "list", "create", "execute", "delete"] as const;
      const allowed = perms.filter(
        (k) => detail.permissions?.[k]
      );
      return [
        detail.roots[0] ?? "",
        allowed.length > 0 ? allowed.join(", ") : "granted",
      ];
    }
    case "api": {
      const methods = (detail.actions ?? []).join(", ");
      return [detail.urls[0] ?? "", methods || "granted"];
    }
    default:
      return [];
  }
}
