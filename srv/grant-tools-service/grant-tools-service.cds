namespace sap.scai.grants;
using sap.scai.grants.discovery as discovery from '../../db/discovery.cds';

 

@path: '/grants'
@protocol: 'rest'
@impl: './grant-tools-service.tsx'
@title: 'Grant Tools Service'
@Capabilities.BatchSupported       : false
@Capabilities.KeyAsSegmentSupported: false
@Core.Description: 'Service for managing grant tools with configurable available tools schema'
@Core.LongDescription: 'Service that provides grant:request tool and allows configuration of available tools schema'
@Authorization.SecuritySchemes     : [{Authorization: 'http_bearer'}]
@Authorization.Authorizations      : [{
  $Type       : 'Authorization.Http',
  Name        : 'http_bearer',
  Description : 'HTTP authentication with bearer token',
  Scheme      : 'bearer',
  BearerFormat: 'JWT'
}]
service GrantToolsService {
  
  entity Mcps as projection on discovery.McpDestinations;
  entity Agents as projection on discovery.Agents  actions {
    action mcp(jsonrpc: String, id: Integer, method: String, params: Map, agent: String, grant_id: String, host: String) returns Map;

    function meta() returns Map;
  };
   
  entity Tools as projection on discovery.Tools;

  action register(destination: Map) returns Map;

  action mcp(jsonrpc: String, id: Integer, method: String, params: Map) returns Map;
  
  @requires: 'authenticated-user'
  function callback(code: String, state: String) returns String;

  function meta() returns Map;

}
