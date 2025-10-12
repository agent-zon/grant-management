using com.sap.agent.grants as grants from '../db/grants.cds';

annotate grants.Grants with @ams.attributes: {
  subject: (subject),
  actor: (actor),
  modifiedBy: (modifiedBy),
  createdBy: (createdBy),
  status: (status),
  scope: (scope)
};

annotate grants.Consents with @ams.attributes: {
  subject: (subject),
  modifiedBy: (modifiedBy),
  createdBy: (createdBy),
  scope: (scope)
};

annotate grants.Grants with @(restrict: [
    { grant: 'READ', to: 'authenticated-user'},
    { grant: 'DELETE', to: 'authenticated-user'},
    { grant: 'WRITE', to: 'authenticated-user'}

]);



annotate grants.Consents with @(restrict: [
    { grant: 'READ', to: 'authenticated-user',  where: 'subject = $user or modifiedBy = $user' },
    { grant: 'WRITE', to: 'authenticated-user'}
 ]);


@path: '/grants-management' 
@requires: ['authenticated-user']
@impl: './grant-management.tsx'
service GrantsManagementService {
   
    @cds.redirection.target
    entity Grants as projection on grants.Grants {
        *
    }; 

    entity AuthorizationDetail as projection on grants.AuthorizationDetail;

    entity ConsentGrant as projection on grants.ConsentGrant; 
 
    @cds.redirection.target
    entity Consents as projection on grants.Consents; 
}         