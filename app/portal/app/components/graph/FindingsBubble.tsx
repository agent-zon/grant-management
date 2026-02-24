import { useState } from "react";
import { TriangleAlert, ChevronDown, ChevronUp } from "lucide-react";
import type { FindingInfo } from "./graph-types";

export function FindingsBubble({
  findings,
  rightOffset = 0,
}: {
  findings: FindingInfo[];
  rightOffset?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (findings.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16 + rightOffset,
        zIndex: 10,
        transition: "right 0.25s ease",
        width: expanded ? 360 : "auto",
      }}
    >
      {/* Collapsed pill */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 16px",
            background: "#fffbeb",
            border: "1.5px solid #fbbf24",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(245,158,11,0.18)",
            fontSize: 13,
            fontWeight: 700,
            color: "#92400e",
            whiteSpace: "nowrap",
          }}
        >
          <TriangleAlert size={15} color="#f59e0b" strokeWidth={2.5} />
          {findings.length} {findings.length === 1 ? "Finding" : "Findings"}
          <ChevronDown size={14} color="#92400e" strokeWidth={2} />
        </button>
      )}

      {/* Expanded card */}
      {expanded && (
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #fbbf24",
            borderRadius: 14,
            boxShadow: "0 4px 20px rgba(245,158,11,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <button
            onClick={() => setExpanded(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "12px 16px",
              background: "#fffbeb",
              borderBottom: "1px solid #fde68a",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TriangleAlert size={16} color="#f59e0b" strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>
                {findings.length}{" "}
                {findings.length === 1 ? "Finding" : "Findings"}
              </span>
            </div>
            <ChevronUp size={16} color="#92400e" strokeWidth={2} />
          </button>

          {/* Finding list */}
          <div style={{ padding: "4px 0" }}>
            {findings.map((finding, idx) => (
              <div
                key={finding.findingId}
                style={{
                  padding: "14px 18px",
                  borderBottom:
                    idx < findings.length - 1
                      ? "1px solid #f3f4f6"
                      : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: "#f59e0b",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#92400e",
                    }}
                  >
                    {finding.label}
                  </span>
                  {finding.severity && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: finding.severity === "critical" || finding.severity === "high" ? "#dc2626" : "#92400e",
                        background: finding.severity === "critical" || finding.severity === "high" ? "#fef2f2" : "#fffbeb",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {finding.severity}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    lineHeight: 1.6,
                    margin: 0,
                    paddingLeft: 12,
                  }}
                >
                  {finding.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
