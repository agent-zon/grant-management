  
@path: '/demo' 
@protocol: 'rest' 
@impl: './demo-service.tsx' 
@requires: ['authenticated-user','system-user']
@title: 'Demo Service'
@Core.Description: 'Demonstration endpoints and UI helpers'
@Core.LongDescription: 'Provides interactive demo flows and helper HTML to showcase grant flows, events, and integrations.'
service DemoService {
    @method: [PUT, POST, GET]
    function request(config: String) returns String;
     
    function navbar(grant_id: String, event: String) returns String;
    
    function main() returns String; 
    
    function index() returns String;
    
    @method: [PUT, POST, GET] 
    function callback(code: String, code_verifier: String, redirect_uri: String) returns String;
   
    function reset() returns String;

    function elevate(grant_id: String) returns String;

    function event_handlers() returns String;

    function send_event(type: String, grant_id: String) returns String;
} 
    