import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";

/** GET Policies/.../resources → <option> elements for the datalist (MCP servers only). */
export async function RESOURCES(this: any, req: cds.Request) {
  const { resources } = req.data || {};
  const list = Array.isArray(resources) ? resources : [];
  return sendHtml(
    req,
    list
      .map((r: { value: string; label: string }) => `<option value="${r.value}" label="${r.label}">${r.label}</option>`)
      .join("\n")
  );
}

/** GET .../resources/{name}/toggle → returns toggle HTML (enable or disable UI based on state). */
export async function RESOURCES_TOGGLE(this: any, req: cds.Request) {
  const { agent, version, resources, resource } = req.data || {};
  if (!agent || !resource) return req.reject(400, "Missing agent or resource " + resource + " " + JSON.stringify({ agent, version, resources, resource, data: req.data }));
  const list = Array.isArray(resources) ? resources : [];
  const entry = list.find((r: { name: string }) => r.name === resource);
  return { agent: agent.id, version, resource, entry };
}

/** POST .../resources/{name}/enable → commit enabled, publish resource-enabled, return enabled-state UI. */
export async function RESOURCES_ENABLE(this: any, req: cds.Request) {
  const { agentId, version, resource } = req.data || {};
  if (!agentId || !resource) return req.reject(400, "Missing agentId or resource");
  !resource.enabled && await resource.update(true);
  if (req.http?.res) {
    req.http.res.setHeader("HX-Trigger", JSON.stringify({ "resource-enabled": { agentId, version, resource } }));
  }
  return render(
    req,
    <button
      type="button"
      hx-post={`${resource.slug}/disable`}
      hx-swap="outerHTML"
      hx-trigger="click"
      className="shrink-0 relative inline-flex items-center cursor-pointer w-11 h-6 bg-emerald-500 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:translate-x-full"
    />
  );
}

/** POST .../resources/{name}/disable → commit disabled, publish resource-disabled, return disabled-state UI. */
export async function RESOURCES_DISABLE(this: any, req: cds.Request) {
  const { agent, version, resource } = req.data || {};
  resource.enabled && (await resource.update(false));
  if (req.http?.res) {
    req.http.res.setHeader("HX-Trigger", JSON.stringify({ "resource-disabled": { agentId: agent?.id ?? req.data?.agentId, version, resource } }));
  }
  return render(
    req,
    <button
      type="button"
      hx-post={`${resource.slug}/enable`}
      hx-swap="outerHTML"
      hx-trigger="click"
      className="shrink-0 relative inline-flex items-center cursor-pointer w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5"
    />

  );
}

/** GET .../resources/{name}/card → full resource card (fetched on demand, has displayName, enabled, toggle). */
export async function RESOURCES_CARD(this: any, req: cds.Request) {
  const { resource } = req.data || {};
  if (!resource) return null;
  const { name, displayName, enabled, slug, refFile } = resource;
  return render(
    req,
    <div
      key={name}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border-l-4 border-emerald-200 border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
        <span className="text-sm font-medium">{displayName?.charAt(0)?.toUpperCase() ?? name?.charAt(0)?.toUpperCase() ?? "M"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{displayName || name}</p>
        <p className="text-xs text-gray-500 font-mono truncate" title={refFile ?? name}>
          {refFile ?? name}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* <a
        href={`#resource-${encodeURIComponent(name)}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        title="Read details"
      >
        <span aria-hidden>👁</span> Read
      </a> */}
        {enabled ? (
          <button
            type="button"
            hx-post={`${slug}/disable`}
            hx-swap="outerHTML"
            hx-trigger="click"
            className="shrink-0 relative inline-flex items-center cursor-pointer w-11 h-6 bg-emerald-500 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:translate-x-full"
          />
        ) : (
          <button
            type="button"
            hx-post={`${slug}/enable`}
            hx-swap="outerHTML"
            hx-trigger="click"
            className="shrink-0 relative inline-flex items-center cursor-pointer w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5"
          />
        )}
      </div>
    </div>
  );
}

/** Resources list content (for reload on resource-updated). Same structure as pane slot, no header/connect section. */
function resourcesListContent(resources: { name: string; displayName: string; refFile?: string; slug: string }[], agentId: string, version: string) {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl text-gray-500 bg-gray-50/50">
        <span className="text-2xl mb-2">🌐</span>
        <p className="text-sm font-medium">No resources yet</p>
        <p className="text-xs mt-0.5">Connect a resource to discover tools</p>
      </div>
    );
  }
  return resources.map((r: { name: string; displayName: string; refFile?: string; slug: string }) => (
    <div
      key={r.name}
      hx-get={`${r.slug}/card`}
      hx-trigger="load"
      hx-swap="outerHTML swap:200ms"
      hx-params="v"
      hx-vals="js:{ }"
      className="transition-all fade-in fade-out empty:hidden min-h-0"
    />
  ));
}

/** GET .../resources/slot → resources list only (for reload on resource-updated). */
export async function RESOURCES_SLOT(this: any, req: cds.Request) {
  const { resources, agentId, version } = req.data || {};
  const list = Array.isArray(resources) ? resources : [];
  return render(req, <>{resourcesListContent(list, agentId, version)}</>);
}

/** GET .../resources/pane → list + connect section (3rd pane). List reloads on resource-updated. */
export async function RESOURCES_PANE(this: any, req: cds.Request) {
  const { resources, agentId, version } = req.data || {};
  const total = Array.isArray(resources) ? resources.length : 0;
  return render(
    req,
    <div
      id="resources-pane"
      className="flex flex-col gap-4 min-h-0 flex-1"
      data-agent="{agentId}"
      data-version="{version}"
      hx-get="agents/{agent}/versions/{version}/resources/pane"
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-trigger="agentSelected from:body, resource-updated from:body "
      hx-swap="morph:outerHTML"
    >  
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
        {resourcesListContent(Array.isArray(resources) ? resources : [], agentId ?? "", version ?? "main")}
      </div>
      {/* 3rd pane: connect section — picker stays visible, success/error to connect-status-slot */}
      <div className="pt-4 border-t border-gray-200 space-y-3 shrink-0">
        <div id="connect-status-slot" className="min-h-0 shrink-0" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            hx-get={`agents/${agentId}/versions/${version}/resources/connecter`}
            hx-target="#connect-picker-slot"
            hx-swap="innerHTML"
            hx-trigger="click"
            id="connect-resource-btn"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Connect Resource
          </button>
        </div>
      </div>
    </div>
  );
}
