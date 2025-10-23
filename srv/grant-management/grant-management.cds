using sap.scai.grants as grants from '../../db/grants.cds';

namespace sap.scai.grants;

@path: '/grants-management' 
@requires: ['authenticated-user', 'system-user']
@impl: './grant-management.tsx'
service GrantsManagementService {
   

    entity AuthorizationDetail as projection on grants.AuthorizationDetail;

 
    entity Grants as projection on grants.Grants;

    @cds.redirection.target
    entity Consents as projection on grants.Consents; 
}         