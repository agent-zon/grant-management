@path: '/demo'
@protocol: 'rest'
@impl: './demo-service.tsx'
@requires: ['authenticated-user', 'system-user']
@title: 'DevOps Bot Demo'
@Core.Description: 'Interactive DevOps agent demo with grant-based permissions'
service DemoService {
  
  // Main shell - generate new grant_id and redirect
  function index() returns String;
  
  // Shell and grant status
  function shell(grant_id: String) returns String;
  function grant_status(grant_id: String) returns String;
  
  // Analysis functions
  @method: [POST]
  function analysis_request(grant_id: String) returns String;
  
  function analysis_elements(grant_id: String) returns String;
  function analysis_tile(grant_id: String) returns String;
  
  // Deployment functions
  @method: [POST]
  function deployment_request(grant_id: String) returns String;
  
  function deployment_elements(grant_id: String) returns String;
  function deployment_tile(grant_id: String) returns String;
  
  // Monitoring functions
  @method: [POST]
  function monitoring_request(grant_id: String) returns String;
  
  function monitoring_elements(grant_id: String) returns String;
  function monitoring_tile(grant_id: String) returns String;
  
  // OAuth callback
  @method: [GET, POST]
  function callback(
    code: String,
    code_verifier: String, 
    redirect_uri: String,
    grant_id: String
  ) returns String;
}
