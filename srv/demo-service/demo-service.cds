@path: '/demo'
@protocol: 'rest'
@impl: './demo-service.tsx'
@requires: ['authenticated-user', 'system-user']
@title: 'DevOps Bot Demo'
@Core.Description: 'Interactive DevOps agent demo with grant-based permissions'
service DemoService {
  
  // Main shell - generate new grant_id and redirect
  function index() returns String;
  
  // DevOps Bot instances - one per grant
  entity DevOpsBot {
    key grant_id: String;
  }
  
  // Bound actions on DevOpsBot
  action DevOpsBot.shell() returns String;
  action DevOpsBot.grant_status() returns String;
  
  // Analysis capability
  entity Analysis {
    key grant_id: String;
  }
  
  // Analysis actions
  action Analysis.request() returns String;      // POST - create PAR request
  action Analysis.elements() returns String;     // GET - UI elements
  action Analysis.tile() returns String;         // GET - tile view
  
  // Deployment capability  
  entity Deployment {
    key grant_id: String;
  }
  
  // Deployment actions
  action Deployment.request() returns String;    // POST - create PAR request
  action Deployment.elements() returns String;   // GET - UI elements
  action Deployment.tile() returns String;       // GET - tile view
  
  // Monitoring capability
  entity Monitoring {
    key grant_id: String;
  }
  
  // Monitoring actions
  action Monitoring.request() returns String;    // POST - create PAR request
  action Monitoring.elements() returns String;   // GET - UI elements
  action Monitoring.tile() returns String;       // GET - tile view
  
  // OAuth callback - stateless
  @method: [GET, POST]
  function callback(
    code: String,
    code_verifier: String, 
    redirect_uri: String,
    grant_id: String
  ) returns String;
}
