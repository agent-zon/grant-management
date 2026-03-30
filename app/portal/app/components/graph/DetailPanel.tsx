import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Database,
  HardDrive,
  Globe,
  Bot,
  Check,
  XCircle,
  FileKey,
  Shield,
} from "lucide-react";
import type { LeafResource, LeafType } from "./graph-types";
import { getTypeColor, getLeafTypeLabel } from "./graph-utils";

const leafIcons = {
  mcp_tool: Zap,
  db_table: Database,
  fs_path: HardDrive,
  api_endpoint: Globe,
  system_connection_scope: Shield,
} as const;

// ── Styles ───────────────────────────────────────────────────────────────────

const mono: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  color: "#131e29",
  background: "#f5f6f7",
  padding: "5px 10px",
  borderRadius: 8,
  wordBreak: "break-all",
  lineHeight: 1.5,
};

const pill: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 999,
  fontWeight: 500,
  lineHeight: 1.4,
};

// ── Panel component ──────────────────────────────────────────────────────────

interface DetailPanelProps {
  leaves: LeafResource[];
  collapsed: boolean;
  onToggle: () => void;
}

export function DetailPanel({ leaves, collapsed, onToggle }: DetailPanelProps) {
  const [pageIndex, setPageIndex] = useState(0);

  // Reset to last page when leaves change (new selection always appended last)
  useEffect(() => {
    setPageIndex(leaves.length - 1);
  }, [leaves.length]);

  const leaf = leaves[Math.min(pageIndex, leaves.length - 1)];
  if (!leaf) return null;

  const total = leaves.length;
  const color = getTypeColor(leaf.sourceDetailType);
  const Icon = leafIcons[leaf.leafType];
  const isDenied = leaf.status === "denied";

  return (
    <div
      data-testid="detail-panel"
      className="hz-detail-panel"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 400,
        height: "100%",
        background: "#ffffff",
        borderLeft: "1px solid #e5e7eb",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
        zIndex: 50,
        display: "flex",
        flexDirection: "row",
        transform: `translateX(${collapsed ? 364 : 0}px)`,
        transition: "transform 0.25s ease",
      }}
    >
      {/* Toggle strip */}
      <div
        style={{
          width: 36,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 18,
          borderRight: collapsed ? "none" : "1px solid #f0f0f0",
        }}
      >
        <button
          data-testid="detail-panel-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {collapsed ? (
            <ChevronLeft size={14} color="#6b7280" />
          ) : (
            <ChevronRight size={14} color="#6b7280" />
          )}
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: collapsed ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {/* Pagination bar (only when multiple leaves selected) */}
        {total > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 20px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPageIndex((i) => Math.max(0, i - 1));
              }}
              disabled={pageIndex === 0}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: pageIndex === 0 ? "#f5f6f7" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: pageIndex === 0 ? "default" : "pointer",
                opacity: pageIndex === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} color="#6b7280" />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
              {pageIndex + 1} / {total}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPageIndex((i) => Math.min(total - 1, i + 1));
              }}
              disabled={pageIndex === total - 1}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: pageIndex === total - 1 ? "#f5f6f7" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: pageIndex === total - 1 ? "default" : "pointer",
                opacity: pageIndex === total - 1 ? 0.4 : 1,
              }}
            >
              <ChevronRight size={14} color="#6b7280" />
            </button>
          </div>
        )}

        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isDenied ? "#fee2e2" : `${color}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Icon size={22} color={isDenied ? "#dc2626" : color} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: isDenied ? "#94a3b8" : "#131e29",
                textDecoration: isDenied ? "line-through" : "none",
                lineHeight: 1.3,
              }}
            >
              {leaf.label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  ...pill,
                  fontSize: 10,
                  fontWeight: 700,
                  color,
                  background: `${color}14`,
                  padding: "1px 8px",
                }}
              >
                {getLeafTypeLabel(leaf.leafType)}
              </span>
              <span>{leaf.sublabel}</span>
              {leaf.viaAgent && (
                <span style={{ color: "#0d7c3d", fontStyle: "italic" }}>
                  via {leaf.viaAgent}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trace stepper */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 20px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 16 }}>
            Authorization Trace
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Step 1: Grant */}
            <TraceStep
              step={1}
              icon={<FileKey size={14} color="#0070f2" />}
              title="Grant"
              color="#0070f2"
              isLast={!leaf.trace.delegation}
            >
              <GrantStepContent leaf={leaf} />
            </TraceStep>

            {/* Step 2: A2A Delegation (conditional) */}
            {leaf.trace.delegation && (
              <TraceStep
                step={2}
                icon={<Bot size={14} color="#0d7c3d" />}
                title="A2A Delegation"
                color="#0d7c3d"
                isLast={false}
              >
                <DelegationStepContent leaf={leaf} />
              </TraceStep>
            )}

            {/* Step 3: Authorization Detail */}
            <TraceStep
              step={leaf.trace.delegation ? 3 : 2}
              icon={<Shield size={14} color={color} />}
              title="Authorization Detail"
              color={color}
              isLast={false}
            >
              <DetailStepContent leaf={leaf} />
            </TraceStep>

            {/* Step 4: Resource (the leaf) */}
            <TraceStep
              step={leaf.trace.delegation ? 4 : 3}
              icon={<Icon size={14} color={isDenied ? "#dc2626" : color} />}
              title="Resource"
              color={isDenied ? "#dc2626" : color}
              isLast
            >
              <ResourceStepContent leaf={leaf} />
            </TraceStep>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TraceStep component ─────────────────────────────────────────────────────

function TraceStep({
  step,
  icon,
  title,
  color,
  isLast,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  color: string;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* Vertical line + circle */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 28,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `${color}14`,
            border: `2px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: "#e5e7eb",
              marginTop: 4,
              marginBottom: 4,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#131e29",
            marginBottom: 8,
            lineHeight: "28px",
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Step content components ─────────────────────────────────────────────────

function GrantStepContent({ leaf }: { leaf: LeafResource }) {
  const { grant } = leaf.trace;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={mono}>{grant.grant_id}</div>
      {grant.scope && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <strong>Scope:</strong> {grant.scope}
        </div>
      )}
      {grant.description && (
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
          {grant.description}
        </div>
      )}
      {grant.granted_at && (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Granted: {new Date(grant.granted_at).toLocaleString()}
        </div>
      )}
      {grant.expires_at && (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Expires: {new Date(grant.expires_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function DelegationStepContent({ leaf }: { leaf: LeafResource }) {
  const delegation = leaf.trace.delegation;
  if (!delegation) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Bot size={14} color="#0d7c3d" strokeWidth={2} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#131e29" }}>
          {delegation.agentDisplayName}
        </span>
        <span
          style={{
            ...pill,
            fontSize: 9,
            fontWeight: 700,
            color: "#0d7c3d",
            background: "#0d7c3d14",
            padding: "1px 6px",
          }}
        >
          A2A
        </span>
      </div>
      {delegation.description && (
        <div
          style={{
            fontSize: 12,
            color: "#131e29",
            lineHeight: 1.5,
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {delegation.description}
        </div>
      )}
    </div>
  );
}

function DetailStepContent({ leaf }: { leaf: LeafResource }) {
  const detail = leaf.trace.delegation
    ? leaf.trace.delegation.restrictedDetail
    : leaf.trace.authorizationDetail;

  switch (detail.type) {
    case "mcp_server":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            <strong>Server:</strong> {detail.server}
          </div>
          {detail.transport && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              <strong>Transport:</strong> {detail.transport.toUpperCase()}
            </div>
          )}
          {detail.tools && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              <strong>Tools:</strong> {detail.tools.length} total ({detail.tools.filter(t => t.granted).length} granted)
            </div>
          )}
        </div>
      );
    case "database":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            <strong>Database:</strong> {detail.database}
            {detail.schema ? `.${detail.schema}` : ""}
          </div>
          {detail.actions && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {detail.actions.map((a) => (
                <span key={a} style={{ ...pill, background: "#f5f6f7", color: "#131e29" }}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    case "file_system":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            <strong>Paths:</strong>
          </div>
          {detail.roots.map((r) => (
            <div key={r} style={mono}>{r}</div>
          ))}
          {detail.permissions && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {(["read", "write", "list", "create", "execute", "delete"] as const)
                .filter((k) => detail.permissions?.[k])
                .map((k) => (
                  <span key={k} style={{ ...pill, background: "#f5f6f7", color: "#131e29" }}>
                    {k}
                  </span>
                ))}
            </div>
          )}
        </div>
      );
    case "api":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {detail.urls.map((url) => (
            <div key={url} style={mono}>{url}</div>
          ))}
          {detail.actions && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {detail.actions.map((a) => (
                <span key={a} style={{ ...pill, background: "#0070f214", color: "#0070f2" }}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function ResourceStepContent({ leaf }: { leaf: LeafResource }) {
  const isDenied = leaf.status === "denied";
  const color = getTypeColor(leaf.sourceDetailType);

  return (
    <div
      style={{
        background: isDenied ? "#fef2f2" : "#f0fdf4",
        border: `1px solid ${isDenied ? "#fca5a5" : "#bbf7d0"}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {isDenied ? (
          <XCircle size={16} color="#dc2626" strokeWidth={2} />
        ) : (
          <Check size={16} color="#256f3a" strokeWidth={2.5} />
        )}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDenied ? "#dc2626" : "#256f3a",
          }}
        >
          {isDenied ? "Denied" : "Granted"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#131e29", fontWeight: 600 }}>
        {leaf.label}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
        {leaf.constraintsSummary}
      </div>
      {leaf.viaAgent && (
        <div style={{ fontSize: 11, color: "#0d7c3d", marginTop: 4, fontStyle: "italic" }}>
          via {leaf.viaAgent}
        </div>
      )}
    </div>
  );
}
