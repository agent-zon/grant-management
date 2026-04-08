import cds from "@sap/cds";
import { render } from "#cds-ssr";
import type { DcnContainer, DcnPolicy } from "./handler.policy";

/** POST .../actas — body: activePolicy (single name or ""), mockHour. DCN from policy middleware (GitHub policies.json via Octokit), not the client. */
export async function ACTAS(this: any, req: cds.Request) {
  const { agentId, version, activePolicy: activePolicyRaw, mockHour: mockHourRaw } = req.data || {};
  const dcnSource = (req.data as any)?.dcn;
  const dcn: DcnContainer =
    typeof dcnSource === "string" ? JSON.parse(dcnSource) : dcnSource || { version: 1, policies: [] };

  const activePolicy =
    activePolicyRaw == null || String(activePolicyRaw).trim() === "" ? "" : String(activePolicyRaw).trim();
  const mockHour =
    mockHourRaw === undefined || mockHourRaw === null || mockHourRaw === ""
      ? new Date().getHours()
      : Number(mockHourRaw);

  console.log(`[actas] Context for ${agentId}:`, activePolicy || "(default only)");

  const triggerPayload = {
    "context-update": {
      agent: agentId,
      version,
      activePolicy,
      mockHour,
    },
  };

  req.http?.res?.setHeader("HX-Trigger", JSON.stringify(triggerPayload));

  return render(
    req,
    <ActAsPanel agentId={agentId} version={version} dcn={dcn} activePolicy={activePolicy} mockHour={mockHour} />,
  );
}

/** GET .../test → Test pane with Act As controls. */
export async function TEST_WITH_ACTAS(this: any, req: cds.Request) {
  const { agentId, version, resources, dcn: dcnRaw } = req.data || {};
  const dcn: DcnContainer = typeof dcnRaw === "string" ? JSON.parse(dcnRaw) : dcnRaw || { version: 1, policies: [] };

  const activePolicy = "";

  return render(
    req,
    <div className="flex flex-col gap-4 content-fade-in">
      <ActAsPanel agentId={agentId} version={version} dcn={dcn} activePolicy={activePolicy} mockHour={new Date().getHours()} />

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Resources ({resources?.length || 0})</h4>
        {(resources?.length || 0) === 0 ? (
          <p className="text-sm text-gray-500 py-2">No resources connected.</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {resources.map((t: any, i: number) => (
              <li key={`${t.name}-${i}`}>
                <div
                  hx-get={`${t.slug}/tools`}
                  hx-trigger="load, context-update from:body"
                  hx-swap="outerHTML"
                  hx-vals={`js:{ version: event?.detail?.version ?? ${JSON.stringify(version)}, agent: event?.detail?.agent ?? ${JSON.stringify(agentId)}, resource: event?.detail?.resource ?? ${JSON.stringify(t.name)}, activePolicy: event?.detail?.activePolicy != null ? String(event.detail.activePolicy) : '' }`}
                >
                  <div className="skeleton bg-white opacity-50 p-2 rounded-lg">
                    <h3 className="text-xs font-semibold text-gray-500">{t.name}</h3>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
  );
}

function formatSchedule(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [, hours, , , days] = parts;
  const dayMap: Record<string, string> = { "1-5": "Mon-Fri", "0-6": "Daily" };
  const dayLabel = dayMap[days] || days;
  const hourLabel = hours === "*" ? "" : hours.replace("-", "-");
  return [dayLabel, hourLabel].filter(Boolean).join(" ");
}

function ActAsPanel({
  agentId,
  version,
  dcn,
  activePolicy,
  mockHour,
}: {
  agentId: string;
  version: string;
  dcn: DcnContainer;
  activePolicy: string;
  mockHour: number;
}) {
  const allPolicies = (dcn.policies || []).filter((p) => !p.default);
  const defaultPol = dcn.policies?.find((p) => p.default);

  const postVals = (nextPolicy: string) =>
    JSON.stringify({ activePolicy: nextPolicy, mockHour });

  return (
    <div id="actas-panel" className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Act as</span>
        <span className="text-[10px] text-gray-400">One contextual policy at a time (default uses only the default composition)</span>
      </div>

      <div className="space-y-1.5">
        <button
          type="button"
          hx-post={`agents/${agentId}/versions/${version}/actas`}
          hx-ext="json-enc"
          hx-vals={postVals("")}
          hx-target="#actas-panel"
          hx-swap="outerHTML"
          hx-params="activePolicy,mockHour"
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
            activePolicy === ""
              ? "bg-indigo-50 border-indigo-300 text-indigo-900"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${activePolicy === "" ? "bg-indigo-500" : "bg-gray-300"}`} />
          <span className="font-semibold">Default</span>
          <span className="ml-auto text-[10px] text-gray-400">{activePolicy === "" ? "ON" : "OFF"}</span>
        </button>

        {allPolicies.map((pol: DcnPolicy) => {
          const name = pol.policy.join(".");
          const isActive = activePolicy === name;
          const useEntry = defaultPol?.uses?.find((u) => (u as any).use.join(".") === name);
          const duties = (useEntry as any)?.annotations?.["sap/duties"] as string[] | undefined;
          const schedule = (useEntry as any)?.annotations?.["sap/schedule"] as string | undefined;
          const hasConsent = duties?.includes("consent");
          const nextPolicy = isActive ? "" : name;

          return (
            <button
              key={name}
              type="button"
              hx-post={`agents/${agentId}/versions/${version}/actas`}
              hx-ext="json-enc"
              hx-vals={postVals(nextPolicy)}
              hx-target="#actas-panel"
              hx-swap="outerHTML"
              hx-params="activePolicy,mockHour"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                isActive
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-indigo-500" : "bg-gray-300"}`} />
              <span className="font-semibold">{name}</span>
              {hasConsent && (
                <span className="px-1 py-0.5 rounded text-[8px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  consent
                </span>
              )}
              {schedule && (
                <span className="px-1 py-0.5 rounded text-[8px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                  {formatSchedule(schedule)}
                </span>
              )}
              <span className="ml-auto text-[10px] text-gray-400">{isActive ? "ON" : "OFF"}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-500">Mock time</span>
        <input
          type="range"
          min="0"
          max="23"
          value={String(mockHour)}
          className="flex-1 h-1 accent-indigo-500"
          hx-post={`agents/${agentId}/versions/${version}/actas`}
          hx-ext="json-enc"
          hx-trigger="change"
          hx-vals={JSON.stringify({ activePolicy })}
          hx-target="#actas-panel"
          hx-swap="outerHTML"
          hx-params="activePolicy,mockHour"
          name="mockHour"
        />
        <span className="text-xs font-mono text-gray-700 w-10">{String(mockHour).padStart(2, "0")}:00</span>
      </div>
    </div>
  );
}
