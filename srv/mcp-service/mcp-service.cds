namespace sap.scai.grants.mcp;

entity McpDestination {
  key name: String;
  virtual destination: Map;
            jsonrpc     : String;
            id          : Integer;
            method      : String;
            params      : Map;
}

@path: '/mcp'
@protocol: 'rest'
@impl: './mcp-stateful-service.tsx'
@title: 'MCP Proxy Service'
@Core.Description: 'JSON-RPC middleware proxy for MCP with authorization tool support'
@Core.LongDescription: 'Thin JSON-RPC middleware that proxies MCP requests and provides authorize tool for agents to request authorization URLs via PAR'
service McpService {
        
  @method: [POST]
  action mcp(jsonrpc: String, id: Integer, method: String, params: Map) returns String;
 
}



