  
@path: '/demo' 
@protocol: 'rest' 
@impl: './demo-service.tsx' 
@requires: ['authenticated-user','system-user']
@title: 'Demo Service'
@Core.Description: 'Demonstration endpoints and UI helpers'
@Core.LongDescription: 'Provides interactive demo flows and helper HTML to showcase grant flows, events, and integrations.'
@OpenAPI.externalDocs: { description: 'Playground', url: '/demo/index' }
service DemoService {
    function navbar(grant_id: String, granted_scopes: String, requesting_scope: String) returns String;
    
    function index() returns String;
    
    @method: [PUT, POST, GET] 
    function callback(code: String, code_verifier: String, redirect_uri: String) returns String;
   
    function reset() returns String;

    function event_handlers() returns String;

    function send_event(type: String, grant_id: String, granted_scopes: String, requesting_scope: String) returns String;
    
    // Permission scope endpoints - can be called in any order
    @method: [GET, POST]
    function request_scope(scope_name: String, grant_id: String) returns String;
    
    // Legacy endpoints for backwards compatibility
    @method: [GET, POST]
    function analysis_request(grant_id: String) returns String;
    
    @method: [GET, POST]
    function deployment_request(grant_id: String) returns String;
    
    @method: [GET, POST]
    function subscription_request(grant_id: String) returns String;
} 
    