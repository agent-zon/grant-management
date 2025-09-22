@path: '/auth'
@requires: ['authenticated-user', 'system-user']
@impl: 'srv/auth-service.js'
@protocol: 'rest'
service AuthService { 
  @rest function me() returns Map; 
}
