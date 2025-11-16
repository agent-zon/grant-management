namespace sap.scai.grants.mcp;


entity McpDestination {
  key name: String;
  virtual destination: Map;
            jsonrpc     : String;
            id          : Integer;
            method      : String;
            params      : Map;

}  actions {
   action mcp(jsonrpc: String, id: Integer, method: String, params: Map) returns Map;

   action customCreate (in: many $self, x: String) returns Map;

  }



@path: '/mcp'
@protocol: 'rest'
@impl: './mcp-service.tsx'
@title: 'MCP Proxy Service'
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
 
  @requires: 'authenticated-user'
  function dest (name : McpDestination:name) returns Map;
  
  function callback(code: String, state: String) returns String;

}



