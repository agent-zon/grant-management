@path: '/auth'
@requires: ['authenticated-user', 'system-user']
@impl: false
@protocol: 'rest'
service AuthService { 
  @rest function me() returns Map; 
}
