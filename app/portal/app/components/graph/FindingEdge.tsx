import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

/**
 * Custom edge that routes to the RIGHT of both nodes, creating a visible
 * "C-shaped" detour:
 *
 *   sourceNode ──────┐
 *                     │  ⚠ label
 *   targetNode ──────┘
 *
 * Path: right from source → vertical to target → left into target,
 * with rounded corners.
 *
 * Clicking the label or dashed line focuses the two finding-related leaves.
 * The label dispatches a "focusFindingLeaves" custom DOM event that
 * the route component listens for.
 */
export function FindingEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  label,
}: EdgeProps) {
  const OFFSET = 50;
  const RADIUS = 12;

  const dy = targetY - sourceY;
  const sign = dy > 0 ? 1 : -1;
  const midX = Math.max(sourceX, targetX) + OFFSET;

  // Clamp radius so it never exceeds half the vertical distance
  const halfDy = Math.abs(dy) / 2;
  const r = Math.min(RADIUS, halfDy);

  const d = [
    `M ${sourceX},${sourceY}`,
    `L ${midX - r},${sourceY}`,
    `Q ${midX},${sourceY} ${midX},${sourceY + sign * r}`,
    `L ${midX},${targetY - sign * r}`,
    `Q ${midX},${targetY} ${midX - r},${targetY}`,
    `L ${targetX},${targetY}`,
  ].join(" ");

  const labelX = midX + 10;
  const labelY = (sourceY + targetY) / 2;

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    document.dispatchEvent(
      new CustomEvent("focusFindingLeaves", {
        detail: { sourceNodeId: source, targetNodeId: target },
      })
    );
  };

  return (
    <>
      <BaseEdge id={id} path={d} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            onClick={handleLabelClick}
            style={{
              position: "absolute",
              transform: `translate(0%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              cursor: "pointer",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: 6,
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
