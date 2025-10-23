import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("vault", "routes/grants.vault.tsx"),
  route("grants", "routes/grants.tsx"),
  route("grants/:id", "routes/grants.$id._index.tsx", {
    caseSensitive: false,
    id: "grant",
  }),
  route("grants/:id/grant", "routes/grants.$id.grant.tsx"),
  route("grants/:id/revoke", "routes/grants.$id.revoke.tsx"),
  route("chat", "routes/chat.tsx"),
  route("chat/:sessionId", "routes/chat.$sessionId.tsx"),
  route("api-docs", "routes/api-docs.tsx"),
  // Grant Management API endpoints (OAuth 2.0 Grant Management specification)
] satisfies RouteConfig;
