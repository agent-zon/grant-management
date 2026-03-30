import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { McpCard } from "types/mcp-card";
import { ResourceEntry } from "./middleware.resources";
import type { DcnContainer } from "./handler.policy";

const AMS_URL = process.env.AMS_URL || "http://localhost:8687";
const AMS_BASE = `${AMS_URL}/sap/scai/v1/authz`;

type ToolDecision = {
  name: string;
  title: string;
  description: string;
  status: "granted" | "denied" | "conditional";
  condition?: string;
};

function flattenMeta(meta: Record<string, any>): Record<string, any> {
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(meta || {})) {
    const key = k.startsWith("sap/") ? k.slice(4) : k;
    flat[key] = typeof v === "object" ? JSON.stringify(v) : v;
  }
  return flat;
}

async function evaluateTools(
  dcn: DcnContainer | undefined,
  resource: ResourceEntry & McpCard,
  agentId: string,
): Promise<ToolDecision[]> {
  const tools = resource?.tools || [];
  if (!dcn?.policies?.length || tools.length === 0) {
    return tools.map((t) => ({ name: t.name, title: t.title || t.name, description: t.description, status: "granted" as const }));
  }

  const serverMeta = flattenMeta(resource._meta || {});

  try {
    const results = await Promise.all(
      tools.map(async (tool) => {
        const toolMeta = flattenMeta((tool as any)._meta || {});
        const input = { ...serverMeta, ...toolMeta, toolName: tool.name };

        try {
          const resp = await fetch(`${AMS_BASE}/agents/${agentId}/mcp-servers/any/decision/useTool`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ primitive: "tools", name: tool.name, input }),
          });

          if (!resp.ok) {
            return { name: tool.name, title: tool.title || tool.name, description: tool.description, status: "granted" as const };
          }

          const decision = await resp.json() as { granted: boolean; denied: boolean; condition?: string };

          let status: ToolDecision["status"] = "denied";
          if (decision.granted) status = "granted";
          else if (decision.denied) status = "denied";
          else status = "conditional";

          return {
            name: tool.name,
            title: tool.title || tool.name,
            description: tool.description,
            status,
            condition: decision.condition,
          };
        } catch {
          return { name: tool.name, title: tool.title || tool.name, description: tool.description, status: "granted" as const };
        }
      }),
    );
    return results;
  } catch (err) {
    console.error("[ams-eval] Error:", err);
    return tools.map((t) => ({ name: t.name, title: t.title || t.name, description: t.description, status: "granted" as const }));
  }
}

const STATUS_STYLE = {
  granted:     { dot: "bg-emerald-500", text: "text-emerald-700" },
  denied:      { dot: "bg-red-500", text: "text-red-400 line-through" },
  conditional: { dot: "bg-amber-500", text: "text-amber-700" },
} as const;

/** GET .../resources/{name}/tools → tool list with AMS policy evaluation via mcp-ams service. */
export async function Tools(this: any, req: cds.Request<{ resource: ResourceEntry & McpCard; dcn?: DcnContainer; agentId?: string }>) {
  const { resource, dcn, agentId } = req.data || {};
  const enabled = resource?.enabled;
  const decisions = enabled ? await evaluateTools(dcn, resource, agentId || "unknown") : [];
  const granted = decisions.filter((d) => d.status === "granted").length;
  const denied = decisions.filter((d) => d.status === "denied").length;
  const conditional = decisions.filter((d) => d.status === "conditional").length;

  return render(
    req,
    <div
      id="tools-section"
      className="relative space-y-5 content-fade-in transition-all fade-in duration-200 fade-out duration-200"
      hx-get={`agents/{agent}/versions/{version}/resources/{resource}/tools`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent, resource: event?.detail?.resource }"
      hx-trigger={`resource-${resource.name}-updated from:body`}
      hx-swap="innerHTML"
      hx-select="#tools-section"
    >
      {decisions.length === 0 ? (
        <p className="font-mono text-green-600 shrink-0">connect_to_{resource.name}</p>
      ) : (
        <>
          {dcn?.policies?.length ? (
            <p className="text-[10px] text-gray-400">
              {granted} granted{denied > 0 ? ` · ${denied} denied` : ""}{conditional > 0 ? ` · ${conditional} conditional` : ""}
            </p>
          ) : null}
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {decisions.map((t, i) => {
              const style = STATUS_STYLE[t.status];
              return (
                <li key={`${resource.name}-${t.name}-${i}`} className="flex items-center gap-2 text-sm py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} title={t.status} />
                  <span className={`font-mono shrink-0 ${style.text}`}>{t.name}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-700 truncate" title={t.description}>{t.title}</span>
                  {t.condition && (
                    <span className="text-[10px] text-amber-600 font-mono ml-auto shrink-0 max-w-[120px] truncate" title={t.condition}>
                      {t.condition}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>,
  );
}
