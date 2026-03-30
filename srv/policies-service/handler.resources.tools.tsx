import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { McpCard } from "types/mcp-card";
import { ResourceEntry } from "./middleware.resources";

/** GET .../resources/{name}/tools → tool list for one MCP resource; reloads on resource-*-updated. */
export async function Tools(this: any, req: cds.Request<{ resource: ResourceEntry & McpCard }>) {
  const { resource } = req.data || {};
  const tools = resource?.enabled ? resource?.tools || [] : [];
  console.log("🚀 Tools:", req.data, resource.name, tools, resource.enabled);
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
      {tools.length === 0 ? (
        <p className="font-mono text-green-600 shrink-0">connect_to_{resource.name}</p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {tools.map((t, i) => (
            <li key={`${resource.name}-${t.name}-${i}`} className="flex items-start gap-2 text-sm">
              <span className="font-mono text-indigo-600 shrink-0">{t.name}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-700 truncate" title={t.description}>{t.title || t.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>,
  );
}
