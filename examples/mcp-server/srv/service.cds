namespace mcp.service;
 
 using from './debug/auth-service.cds';

@path: '/mcp'
@protocol: 'rest'
@impl: './service.tsx'
@title: 'MCP Service'
@Capabilities.BatchSupported       : false
@Capabilities.KeyAsSegmentSupported: false
@Core.Description: 'JSON-RPC middleware proxy for MCP with authorization tool support'
@Core.LongDescription: 'Thin JSON-RPC middleware that proxies MCP requests and provides authorize tool for agents to request authorization URLs via PAR'
@Authorization.SecuritySchemes     : [{Authorization: 'http_bearer'}]
@Authorization.Authorizations      : [{
  $Type       : 'Authorization.Http',
  Name        : 'http_bearer',
  Description : 'HTTP authentication with bearer token',
  Scheme      : 'bearer',
  BearerFormat: 'JWT'
}]
service McpService {
        
  @method: [POST]
  action streaming(jsonrpc: String, id: Integer, method: String, params: Map) returns Map;
  
  function callback(code: String, state: String) returns String;

}



