using sap.scai.debug as debug from '../../db/destination.cds';

namespace sap.scai.debug;
@path: '/debug/destinations' 
@protocol: 'rest' 
@impl: './destination-service.tsx' 
@Core.title: 'Destination Debug Service'
service  DestinationService { 
         
    entity Destinations as projection on debug.Destinations actions { 
        //bound to the collection and not a specific instance of Foo
        action customCreate (in: many $self, name: String) returns Destinations;

        function token() returns Map; 
        @Core.MediaType: 'application/octet-stream'
        function ui() returns String; 
    }

}