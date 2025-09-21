@path: '/api'
@requires: ['authenticated-user', 'system-user']
@impl: 'srv/user-service.js'
service UserService { 
  @rest function me() returns Map; 
}
