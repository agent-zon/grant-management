

export type McpCard = {
  $schema: string;
  version: string;
  protocolVersions: string[];
  serverInfo: {
    name: string;
    title: string;
    version: string;
    description: string;
  };
  transport: {
    type: string;
    endpoint: string;
    "x-destination": string;
  };
  capabilities: {
    tools: Record<string, any>;
    resources: Record<string, any>;
  };
  authentication: {
    required: boolean;
    schemas: string[];
  };
  _meta: Record<string, any>;
  tools: {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, any>;
  }[];
  links: {
    slug: string;
    content: string;
    enable: string;
    disable: string;
  };
};
