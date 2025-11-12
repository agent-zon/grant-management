//destination debug service, endpoints to query and to create destinations

@path: '/debug/destinations'
service  DestinationService {

    function destinations() returns Map;
    
    function destination(name: String) returns Map;

}