using sap.scai.debug as debug from '../../db/destination.cds';

namespace sap.scai.destinations;

@path: '/dest'
@protocol: 'rest'
@impl: './destination-service.tsx'
@Core.title: 'MCP Destination Service'
@Core.Description: 'View and register MCP servers via destinations, discover tools, and retrieve auth tokens'
@requires: ['authenticated-user', 'system-user']
service DestinationManagementService {

    @cds.persistence.skip
    entity Destinations as projection on debug.Destinations;

    action register(
        name        : String,
        url         : String,
        authentication : String,
        description : String
    ) returns Map;

    function discover(name : String) returns Map;
}
