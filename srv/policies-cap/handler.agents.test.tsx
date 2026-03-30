import cds from "@sap/cds";
import { render } from "#cds-ssr";

/** GET .../test → Test pane: view tools, chat, act as. */
export async function TEST(this: any, req: cds.Request) {
  const { agentId, version, resources } = req.data || {};

  const protocol = req.http?.req.protocol || "https";
  const host = req.http?.req.headers?.host || "localhost";
  const baseUrl = `${protocol}://${host}`;
  const chatUrl = `${baseUrl}/chat`;
  const actAsUrl = `${baseUrl}/chat?agent=${agentId}&version=${version}`;

  return render(
    req,
    <div className="flex flex-col gap-4 content-fade-in">
      <div className="flex gap-2 flex-wrap">
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-sm font-medium border border-indigo-200 transition-colors"
        >
          <span>💬</span> Chat
        </a>
        <a
          href={actAsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium border border-amber-200 transition-colors"
        >
          <span>🎭</span> Act as
        </a>
      </div>
      <div>
        <div
          id="tools-section"
          className="relative space-y-5 content-fade-in"
          hx-get={`agents/{agent}/versions/{version}/tools`}
          hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
          hx-trigger="agent-selected from:body"
          hx-swap="innerHTML"
          hx-select="#tools-section"
        >
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Resources ({resources.length})</h4>
          {resources.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No resources connected.</p>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 gap-2">
              {resources.map((t, i) => (
                <li key={`${t.server}-${t.name}-${i}`} className="flex items-start gap-2 text-sm">
                  <div hx-get={`${t.slug}/tools`} hx-trigger="load" hx-swap="outerHTML" hx-vals="js:{  }">
                    <div className="skeleton bg-white opacity-50 p-2 rounded-lg">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                        {t.name}
                      </h3>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
  );
}
