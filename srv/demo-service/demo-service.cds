  
@path: '/demo' 
@protocol: 'rest' 
@impl: './demo-service.tsx' 
@requires: ['authenticated-user','system-user']
@title: 'Demo Service'
@Core.Description: 'Demonstration endpoints and UI helpers'
@Core.LongDescription: 'Provides interactive demo flows and helper HTML to showcase grant flows, events, and integrations.'
@OpenAPI.externalDocs: { description: 'Playground', url: '/demo/index' }
service DemoService {
    function index() returns String;

    // Simplified step-by-step endpoints (no XState)
    // Step 1 — Analysis permissions
    @method: [GET, POST]
    function permissions_analysis_request() returns String;

    @method: [GET, POST]
    function permissions_analysis_callback(code: String, code_verifier: String, redirect_uri: String) returns String;

    // Step 2 — Report permissions (merge into existing grant)
    @method: [GET, POST]
    function permissions_report_request(grant_id: String) returns String;

    @method: [GET, POST]
    function permissions_report_callback(code: String, code_verifier: String, redirect_uri: String) returns String;

    // Step 3 — Deployment permissions (merge into existing grant)
    @method: [GET, POST]
    function permissions_deployment_request(grant_id: String) returns String;

    @method: [GET, POST]
    function permissions_deployment_callback(code: String, code_verifier: String, redirect_uri: String) returns String;
} 
    