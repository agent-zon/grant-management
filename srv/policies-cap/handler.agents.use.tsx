import cds from "@sap/cds";
import { render } from "#cds-ssr";

/** GET .../use → Use pane: copy MCP proxy URL, A2A URL (TBD). */
export async function USE(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  const protocol = req.http?.req?.protocol || "https";
  const host = req.http?.req?.headers?.host || "localhost";
  const baseUrl = `${protocol}://${host}`;
  const mcpProxyUrl = `${baseUrl}/grants/mcp`;

  return render(
    req,
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">MCP Server (Grants Proxy)</h4>
        <div className="flex gap-2 items-center" id="use-mcp-copy-area">
          <input
            type="text"
            readOnly
            value={mcpProxyUrl}
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 text-gray-800 truncate"
          />
          <button
            type="button"
            className="shrink-0 px-4 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-sm font-medium border border-indigo-200 transition-colors"
            data-copy-url={mcpProxyUrl}
          >
            Copy
          </button>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=document.getElementById('use-mcp-copy-area');if(!c)return;var b=c.querySelector('button[data-copy-url]');if(!b||b.dataset.bound)return;b.dataset.bound='1';b.onclick=function(){var u=this.dataset.copyUrl;if(u&&navigator.clipboard){navigator.clipboard.writeText(u);var o=this.textContent;this.textContent='Copied!';var t=this;setTimeout(function(){t.textContent=o;},1500);}};})();`,
          }}
        />
        <p className="text-[11px] text-gray-500 mt-1.5">Use this URL as the MCP server endpoint. Use x-destination header for BTP destinations.</p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">A2A URL</h4>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value="TBD"
            placeholder="Coming soon"
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 border border-dashed border-gray-300 text-gray-400"
          />
          <button
            type="button"
            disabled
            className="shrink-0 px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium border border-gray-200 cursor-not-allowed"
          >
            Copy
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">Agent-to-agent endpoint (TBD).</p>
      </div>
    </div>
  );
}
