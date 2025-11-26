@path: '/auth'
@requires: ['authenticated-user', 'system-user']
@impl: './auth-service.tsx'
@protocol: 'rest'
@title: 'Auth Service'
@Core.Description: 'Authenticated user profile and utilities'
@Core.LongDescription: 'Provides simple authenticated user information and helper endpoints for demos and integration tests.'
service AuthService { 
  @rest function me() returns Map; 

  @rest function token() returns String;
}
