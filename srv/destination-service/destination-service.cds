using sap.scai.debug as debug from '../../db/destination.cds';

namespace sap.scai.destinations;

@path: '/mcps'
@protocol: 'rest'
@impl: './destination-service.tsx'
@Core.title: 'MCP Destination Service'
@Core.Description: 'View and register MCP servers via destinations, discover tools, and retrieve auth tokens'
@requires: ['authenticated-user', 'system-user']
service DestinationManagementService {

    @cds.persistence.skip
    entity destinations as projection on debug.Destinations actions {
        function draft(in: many $self) returns String;
        function authParams(in: many $self,authentication : String) returns String;

        function tools(destination: $self) returns String;
    }
}
