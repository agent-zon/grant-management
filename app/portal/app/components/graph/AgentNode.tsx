import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import type { AgentNodeData } from "./graph-types";

export function AgentNode({ data }: NodeProps) {
  const { label, grantCount, permissionCount, deniedCount } =
    data as AgentNodeData;

  return (
    <div
      data-testid="agent-node"
      className="flex flex-col items-center"
      style={{ minWidth: 140 }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          border: "3px solid #0070f2",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,112,242,0.18)",
        }}
      >
        <Bot size={40} color="#0070f2" strokeWidth={1.8} />
      </div>
      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontWeight: 600,
          fontSize: 14,
          color: "#131e29",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginTop: 2,
        }}
      >
        {grantCount} grant{grantCount !== 1 ? "s" : ""} &middot;{" "}
        {permissionCount} permission{permissionCount !== 1 ? "s" : ""}
        {deniedCount > 0 && (
          <span style={{ color: "#dc2626" }}>
            {" "}
            ({deniedCount} denied)
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, top: 48 }}
      />
    </div>
  );
}
