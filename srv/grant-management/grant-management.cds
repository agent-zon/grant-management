using sap.scai.grants as grants from '../../db/grants.cds';

namespace sap.scai.grants;
@odata.version: '4.1'
@title: 'Grants Management Service'
@Core.Description: 'OAuth 2.0 Grant Management API (query, revoke, metadata)'
@Core.LongDescription: 'Exposes grant status, revocation, and discovery per OAuth 2.0 Grant Management. See external docs for usage and examples.'
@OpenAPI.externalDocs: { description: 'User Dashboard', url: '/grants-management/Grants' }
@protocol: 'rest'
@path: '/grants-management'
// OR semantics: any grant_management_* role or system-user. Assign cap.grant_management_by_subject in IAS to grant all five roles scoped by subject.
@requires: [
    'grant_management_create',
    'grant_management_update',
    'grant_management_replace',
    'grant_management_revoke',
    'grant_management_query',
    'system-user'
]
@impl: './grant-management.tsx'
service GrantsManagementService {
   

    entity AuthorizationDetails as projection on grants.AuthorizationDetails;

 
    entity Grants as projection on grants.Grants;

    @cds.redirection.target
    /** authenticated-user by default; READ own rows via subject = $user; system-user unrestricted READ. */
    @restrict: [
        { grant: ['CREATE'], to: ['authenticated-user', 'system-user'] },
        { grant: ['READ'], to: ['authenticated-user'], where: 'subject = $user' },
        { grant: ['READ'], to: ['system-user'] }
    ]
    entity Consents as projection on grants.Consents;
}         