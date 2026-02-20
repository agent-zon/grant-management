using sap.scai.debug as debug from '../../db/destination.cds';

namespace sap.scai.destinations;


@path: '/agents'
@protocol: 'rest'
@impl: './agents-service.tsx'
@Core.title: 'MCP Destination Service'
@Core.Description: 'View and register MCP servers via destinations, discover tools, and retrieve auth tokens'
@requires: ['authenticated-user', 'system-user']
service AgentsService {

    @cds.persistence.skip
    entity agents {
        tid: String;

id: String;

name: String;

} actions { function draft(in: many $self) returns String;

function discovery(destination: $self) returns String;

} }