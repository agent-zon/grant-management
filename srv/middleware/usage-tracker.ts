// Usage tracking middleware for grant usage monitoring
import cds from "@sap/cds";

export function createUsageTracker() {
  return async (req: any, res: any, next: any) => {
    // Check if request has authorization header with grant-based access token
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer at_")) {
      try {
        // Extract grant_id from access token format: at_${ulid()}:${grant_id}
        const token = authHeader.replace("Bearer ", "");
        const parts = token.split(":");

        if (parts.length === 2) {
          const grant_id = parts[1];

          // Create usage record
          const { GrantUsage } = cds.entities("grant.management");

          await cds.run(
            INSERT.into(GrantUsage).entries({
              grant_id: grant_id,
              ip: req.ip || req.connection.remoteAddress,
              user_agent: req.headers["user-agent"],
              client_id: req.headers["client-id"] || "unknown",
              createdAt: new Date().toISOString(),
              createdBy: req.user?.id || "system",
            })
          );

          // Update grant usage count and last_used
          await cds.run(
            UPDATE("com.sap.agent.grants.Grants", grant_id).with({
              usage_count: { "+=": 1 },
              last_used: new Date().toISOString(),
            })
          );

          console.log("📊 Tracked usage for grant:", grant_id);
        }
      } catch (error) {
        console.error("❌ Error tracking usage:", error);
        // Don't fail the request if usage tracking fails
      }
    }

    next();
  };
}

export default createUsageTracker;
