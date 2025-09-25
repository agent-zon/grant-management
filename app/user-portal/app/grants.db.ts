function generateConsentData() {
  const tokens: SessionToken[] = [
    {
      id: "token-1",
      sessionId: "S123",
      scopes: ["tools:read", "data:export"],
      issuedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      status: "active",
      usage: 18,
      lastActivity: new Date(Date.now() - 300000).toISOString(),
    },
  ];

  const requests: ConsentRequest[] = [
    {
      id: "req-1",
      actor: "agent-A1",
      sessionId: "S125",
      requestedScopes: ["tools:write", "system:admin"],
      tools: ["CreateFile", "ConfigureSystem"],
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: "pending",
      authorizationLink:
        "https://idp.example.com/auth?scopes=tools:write+system:admin&session=S125",
    },
  ];

  return { grants, tokens, requests };
}

export interface SessionToken {
  id: string;
  sessionId: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
  usage: number;
  lastActivity?: string;
}

export interface ConsentRequest {
  id: string;
  actor: string;
  sessionId: string;
  requestedScopes: string[];
  tools: string[];
  timestamp: string;
  status: "pending" | "approved" | "denied" | "expired";
  authorizationLink?: string;
  userResponse?: {
    approvedScopes: string[];
    deniedScopes: string[];
    timestamp: string;
  };
}

export interface ConsentGrant {
  revokedAt?: string;
  id: string;
  scope: string;
  description: string;
  granted: boolean;
  grantedAt?: string;
  expiresAt?: string;
  sessionId?: string;
  usage: number;
  requester?: "resource_owner" | "client" | "authorization_server" | "agent";
  requesterId?: string;
  requesterName?: string;

  lastUsed?: string;
  toolsIncluded: string[];
  riskLevel: "low" | "medium" | "high";
  category:
    | "file-system"
    | "data-access"
    | "system-admin"
    | "network"
    | "analytics";
}

const grants: ConsentGrant[] = [
  {
    id: "1",
    scope: "tools:read",
    description: "Read access to file system tools (ListFiles, ReadFile)",
    granted: true,
    grantedAt: new Date(Date.now() - 3600000).toISOString(),
    sessionId: "S123",
    usage: 15,
    lastUsed: new Date(Date.now() - 300000).toISOString(),
    toolsIncluded: ["ListFiles", "ReadFile", "GetFileInfo"],
    requester: "resource_owner",
    requesterId: "john.smith",
    riskLevel: "low",
    category: "file-system",
  },
  {
    id: "2",
    scope: "tools:write",
    description:
      "Write access to file system tools (CreateFile, UpdateFile, DeleteFile)",
    granted: false,
    usage: 0,
    toolsIncluded: ["CreateFile", "UpdateFile", "DeleteFile", "MoveFile"],
    requester: "resource_owner",
    requesterId: "john.smith",
    riskLevel: "low",
    category: "file-system",
  },
  {
    id: "3",
    scope: "data:export",
    description: "Export user data and generate reports",
    granted: true,
    grantedAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    sessionId: "S123",
    usage: 3,
    lastUsed: new Date(Date.now() - 1800000).toISOString(),
    toolsIncluded: ["ExportData", "GenerateReport", "CreateBackup"],
    requester: "resource_owner",
    requesterId: "john.smith",
    riskLevel: "low",
    category: "data-access",
  },
  {
    id: "4",
    scope: "system:analyze",
    description:
      "System analysis and monitoring tools (SystemCheck, AnalyzeAnomaly)",
    granted: true,
    grantedAt: new Date(Date.now() - 600000).toISOString(),
    sessionId: "S124",
    usage: 8,
    lastUsed: new Date(Date.now() - 360000).toISOString(),
    toolsIncluded: [
      "GatherSystemInfo",
      "AnalyzeAnomaly",
      "SystemCheck",
      "HealthMonitor",
    ],
    requester: "client",
    requesterId: "agent-A1",
    riskLevel: "low",
    category: "system-admin",
  },
  {
    id: "5",
    scope: "notifications:send",
    description:
      "Send notifications and alerts (CreateNotification, SendAlert)",
    granted: true,
    grantedAt: new Date(Date.now() - 420000).toISOString(),
    sessionId: "S124",
    usage: 5,
    lastUsed: new Date(Date.now() - 360000).toISOString(),
    toolsIncluded: ["CreateNotification", "SendAlert", "NotifyStakeholders"],
    requester: "client",
    requesterId: "agent-A1",
    riskLevel: "low",
    category: "system-admin",
  },
  {
    id: "6",
    scope: "deployment:hotfix",
    description:
      "Deploy emergency hotfixes and patches (DeployHotfix, RollbackPatch)",
    granted: false,
    usage: 0,
    toolsIncluded: ["DeployHotfix", "RollbackPatch", "ValidateDeployment"],
    requester: "resource_owner",
    requesterId: "john.smith",
    riskLevel: "low",
    category: "system-admin",
  },
  {
    id: "7",
    scope: "payroll:access",
    description:
      "Access payroll system and employee data (PayrollQuery, EmployeeData)",
    granted: true,
    grantedAt: new Date(Date.now() - 180000).toISOString(),
    sessionId: "S126",
    usage: 12,
    lastUsed: new Date(Date.now() - 60000).toISOString(),
    toolsIncluded: [
      "PayrollQuery",
      "EmployeeData",
      "SalaryCalculation",
      "TaxComputation",
    ],
    requester: "resource_owner",
    requesterId: "john.smith",
    riskLevel: "low",
    category: "data-access",
  },
  {
    id: "8",
    scope: "network:access",
    description:
      "Access external APIs and network resources (HttpRequest, ApiCall)",
    granted: true,
    grantedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    sessionId: "S125",
    usage: 25,
    lastUsed: new Date(Date.now() - 900000).toISOString(),
    toolsIncluded: ["HttpRequest", "ApiCall", "WebhookTrigger", "DataSync"],
    requester: "authorization_server",
    requesterId: "mcp-guard",
    riskLevel: "low",
    category: "network",
  },
  {
    id: "9",
    scope: "system:admin",
    description: "Administrative system access (ConfigureSystem, ManageUsers)",
    granted: false,
    usage: 0,
    toolsIncluded: [
      "ConfigureSystem",
      "ManageUsers",
      "SystemRestart",
      "SecurityConfig",
    ],
    requester: "agent",
    requesterId: "HR Agent",
    riskLevel: "low",
    category: "system-admin",
  },
  {
    id: "10",
    scope: "database:write",
    description: "Database write operations (UpdateRecord, DeleteRecord)",
    granted: false,
    usage: 0,
    toolsIncluded: [
      "UpdateRecord",
      "DeleteRecord",
      "CreateTable",
      "ModifySchema",
    ],
    requester: "agent",
    requesterId: "Ops Agent",
    riskLevel: "low",
    category: "data-access",
  },
  {
    id: "11",
    scope: "database:write",
    description: "Database write operations (UpdateRecord, DeleteRecord)",
    granted: false,
    usage: 0,
    toolsIncluded: [
      "UpdateRecord",
      "DeleteRecord",
      "CreateTable",
      "ModifySchema",
    ],
    requester: "agent",
    requesterId: "Ops Agent",
    riskLevel: "low",
    category: "data-access",
  },
];

export { grants, generateConsentData };
