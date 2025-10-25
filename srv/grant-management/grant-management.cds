using sap.scai.grants as grants from '../../db/grants.cds';

namespace sap.scai.grants;

@title: 'Grants Management Service'
@Core.Description: 'OAuth 2.0 Grant Management API (query, revoke, metadata)'
@Core.LongDescription: 'Exposes grant status, revocation, and discovery per OAuth 2.0 Grant Management. See external docs for usage and examples.'
@OpenAPI.externalDocs: { description: 'User Dashboard', url: '/grants-management/Grants' }

@path: '/grants-management' 
@requires: ['authenticated-user', 'system-user']
@impl: './grant-management.tsx'
service GrantsManagementService {
   

    entity AuthorizationDetail as projection on grants.AuthorizationDetail;

 
    entity Grants as projection on grants.Grants;

    @cds.redirection.target
    entity Consents as projection on grants.Consents; 
}         