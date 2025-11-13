5. RAR Implementation Examples
5.1 Multi-Location Authorization
{
  "clientId": "mcp-client",
  "subject": "user123", 
  "authorizationDetails": [
    {
      "type": "mcp_access",
      "locations": [
        "https://server-a.mcp.example.com",
        "https://server-b.mcp.example.com"
      ],
      "actions": ["read"],
      "datatypes": ["tools"]
    }
  ]
}
5.2 Action-Specific Permissions
{
  "clientId": "mcp-client",
  "subject": "user123",
  "authorizationDetails": [
    {
      "type": "mcp_access", 
      "locations": ["https://mcp.example.com"],
      "actions": ["read", "write"],
      "datatypes": ["tools"]
    },
    {
      "type": "mcp_access",
      "locations": ["https://mcp.example.com"], 
      "actions": ["read"],
      "datatypes": ["resources"]
    }
  ]
}
5.3 Authorization Evaluation
// Request
{
  "subject": "user123",
  "action": "execute", 
  "resource": "tools",
  "clientId": "mcp-client",
  "mcpServerUri": "https://mcp.example.com"
}

// Response (if "execute" not granted)
{
  "decision": "DENY",
  "reason": "Action 'execute' not permitted for datatype 'tools' on location 'https://mcp.example.com'"
}
// 

package com.mcp.grantmanagement.dto.authzen;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsC