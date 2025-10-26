@path: '/demo/devops_bot'
@protocol: 'rest'
@impl: './demo-service.tsx'
@requires: ['authenticated-user', 'system-user']
@title: 'DevOps Bot Demo'
@Core.Description: 'Interactive DevOps agent demo with grant-based permissions'
service DemoService {
  
  // Main shell
  function shell(grant_id: String) returns String;
  function grant(grant_id: String) returns String;
  
  // Analysis
  function analyze(grant_id: String) returns String;
  @method: [POST]
  function analyze_request(grant_id: String) returns String;
  
  // Deployment
  function deploy(grant_id: String) returns String;
  @method: [POST]
  function deploy_request(grant_id: String) returns String;
  
  // Monitoring
  function monitor(grant_id: String) returns String;
  @method: [POST]
  function monitor_request(grant_id: String) returns String;
  
  // OAuth callback
  @method: [GET, POST]
  function callback(
    code: String,
    code_verifier: String,
    redirect_uri: String
  ) returns String;
}
