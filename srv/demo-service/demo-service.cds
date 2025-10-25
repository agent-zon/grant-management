  
@path: '/demo/devops_bot' 
@protocol: 'rest' 
@impl: './demo-service.tsx' 
@requires: ['authenticated-user','system-user']
@title: 'DevOps Bot Demo'
@Core.Description: 'Interactive DevOps agent demo with grant-based permissions'
@Core.LongDescription: 'Demonstrates progressive permission requests for a DevOps agent with analysis, deployment, and monitoring capabilities.'
service DemoService {
    // Main shell page - generates grant_id on load
    function index() returns String;
    
    // Shell page for specific grant
    function shell(grant_id: String) returns String;
    
    // Request endpoints - create PAR requests
    function analyze_request(grant_id: String) returns String;
    function deploy_request(grant_id: String) returns String;
    function monitor_request(grant_id: String) returns String;
    
    // Section UIs - render grant-aware interfaces
    function analyze(grant_id: String) returns String;
    function deploy(grant_id: String) returns String;
    function monitor(grant_id: String) returns String;
    
    // OAuth callback - returns JSON
    @method: [PUT, POST, GET] 
    function callback(code: String, code_verifier: String, redirect_uri: String) returns String;
} 
    