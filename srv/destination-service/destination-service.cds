using sap.scai.debug as debug from '../../db/destination.cds';

namespace sap.scai.destinations;


@path: '/inspect'
@protocol: 'rest'
@impl: './destination-service.tsx'
@Core.title: 'MCP Destination Service'
@Core.Description: 'View and inspect agents tools, discover tools, and retrieve auth tokens'
@requires: ['authenticated-user', 'system-user']
service DestinationManagementService {

    @cds.persistence.skip
    entity destinations as projection on debug.MCPResource actions {
        function draft(in: many $self) returns String;

function authentication(in: many $self, type : String) returns String;

function discovery(destination: $self) returns String;
function tools(destination: $self) returns String;
@Core.MediaType: 'text/html'
function bind(destination: $self,agent: String) returns String;



}

@cds.persistence.skip
entity authentication {} actions  {
     
function  BasicAuthentication(in: many $self) returns String;

function OAuth2ClientCredentials(in: many $self) returns String;

function OAuth2SAMLBearerAssertion(in: many $self) returns String;

function OAuth2Password(in: many $self) returns String;

function ClientCertificateAuthentication(in: many $self) returns String;

} }