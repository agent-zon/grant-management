import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthorizationDetail } from "#cds-models/sap/scai/grants";
import { MetaEnv, SessionMeta } from "./middleware.meta";
import { Client } from "@modelcontextprotocol/sdk/client";
import { HttpDestination } from "@sap-cloud-sdk/connectivity";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpServerEnv } from "./middleware.mcp";
import { McpClientEnv } from "./middleware.client";
import { McpDestinationEnv } from "./middleware.destination";

export type Env = {
  Variables: {
    tools: Record<string, RegisteredTool>;
    authorization_details: AuthorizationDetail & AuthorizationDetail["tools"];
    "grant.refresh": () => Promise<Record<string, unknown>>;
    "grant.watch": (
      handler: (details: Record<string, unknown>) => void,
    ) => () => void;
   };
} & McpServerEnv & McpClientEnv & McpDestinationEnv & MetaEnv

  