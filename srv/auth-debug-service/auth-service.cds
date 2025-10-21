@path: '/auth'
@requires: ['authenticated-user', 'system-user']
@impl: './auth-service.tsx'
@protocol: 'rest'
service AuthService { 
  @rest function me() returns Map; 
}
