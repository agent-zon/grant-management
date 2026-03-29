// ---------------------------------------------------------------------------
// Consent watcher - DISABLED at the moment - DONT IMPLEMENT
// ---------------------------------------------------------------------------

function registerConsentWatcher(
  authService: any,
  grantService: any,
  meta: SessionMeta,
  server: McpServer,
  tools: Record<string, RegisteredTool>,
  parTool: RegisteredTool,
): void {
  authService.after(["CREATE", "UPDATE"], "Consents", async (data: any) => {
    try {
      const records = Array.isArray(data) ? data : [data];
      for (const record of records) {
        if (record?.grant_id !== meta.grant_id) continue;

        console.log(`[grant-tools] Consent changed for grant ${meta.grant_id}`);
        const details = await fetchMcpDetails(grantService, meta.grant_id);

        parTool.update({
          paramsSchema: {
            tools: getConsentRequireTools(),
            redirect_uri: z.string().default("urn:scai:grant:callback"),
          },
        });

        // if (changed) server.sendToolListChanged();
      }
    } catch (err: any) {
      console.error(
        "[grant-tools] Consent watcher error:",
        err.message,
        err.stack,
      );
    }
  });
}
