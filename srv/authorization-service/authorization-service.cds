namespace sap.scai.grants;

using sap.scai.grants as grants from '../../db/grants.cds';
@path: '/oauth-server'
@impl: './authorization-service.tsx'
@protocol: 'rest' 
@title: 'Authorization Server API'
@Core.Description: 'OAuth 2.0 endpoints and metadata'
@Core.LongDescription: 'Authorization Server endpoints for authorization, PAR, and token exchange with Rich Authorization Requests (RAR) support and grant_id propagation.'
@OpenAPI.externalDocs: { description: 'Playground', url: '/demo/index' }
service AuthorizationService {
     @cds. redirection.target
    entity AuthorizationRequests as projection on grants.AuthorizationRequests;
    @requires: ['authenticated-user', 'system-user'] 
    entity Consents as projection on grants.Consents;
 
    
    @requires: ['authenticated-user']
    @method: ['POST', 'GET']
    // OAuth authorize endpoint with Rich Authorization Requests support
    action authorize(
        request_uri: String,
        client_id: String
 
    ) returns String;

    @requires: ['authenticated-user']
    function authorize_dialog(
        request_uri: String,
        client_id: String
 
    ) returns String;

    // Default callback endpoint for grant completion
    @requires: ['authenticated-user']
    function callback(
        grant_id: String
    ) returns String;

    // PAR (Pushed Authorization Request) endpoint with Rich Authorization Requests support
    action par(
        response_type: String,
        client_id: String,
        redirect_uri: String,
        scope: String,
        state: String,
        code_challenge: String,
        code_challenge_method: String,
        grant_management_action: String,
        grant_id: String, // For merge/update operations
        authorization_details: String, // RFC 9396 - JSON array of authorization_details objects
        requested_actor: String, // OAuth on-behalf-of: actor URN
        subject_token_type: String,
        subject_token: String,
        subject: String

    ) returns { request_uri: String; expires_in: Integer; };
    
    // Token endpoint for authorization code exchange with Rich Authorization Requests support
    action token(
        grant_type: String,
        client_id: String,
        code: String,
        code_verifier: String,
        redirect_uri: String,
        refresh_token: String,
        token_format: String,
        resource: String,
        audience: String,
        scope: String,
        resource_:String,
        assertion:String
    ) returns { 
        access_token: String; 
        token_type: String; 
        expires_in: Integer; 
        scope: String;
        grant_id: String;
        actor: String;
        authorization_details: array of grants.AuthorizationDetailRequest; // RFC 9396 - JSON array of granted authorization_details
    };

    // OAuth Authorization Server Metadata (RFC 8414) with RAR support
    action metadata() returns {
        issuer: String;
        authorization_endpoint: String;
        token_endpoint: String;
        pushed_authorization_request_endpoint: String;
        authorization_details_types_supported: String; // RFC 9396 - JSON array of supported types
        grant_types_supported: String;
        response_types_supported: String;
        code_challenge_methods_supported: String;
    }; 
}   

