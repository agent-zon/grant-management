namespace sap.scai.debug;
//destination debug service, endpoints to query and to create destinations
 

aspect DestinationVirtual  {
    key  name        : String(100);
    
    virtual url : String;
    virtual authentication : String(100);
    virtual proxyType : String(100);
    virtual sapClient : String(1000);
    virtual username : String(1000);
    virtual password : String;
    virtual isTrustingAllCertificates : Boolean;
    virtual clientId : String;
    virtual clientSecret : String;
    virtual tokenServiceUrl : String;
    virtual tokenServiceUser : String;
    virtual tokenServicePassword : String;
    virtual type : String;
    virtual isTestDestination : Boolean;
    virtual cloudConnectorLocationId : String;
    virtual systemUser : String;
    virtual forwardAuthToken : Boolean;
    virtual mtls : Boolean;
    virtual authTokens : many {
        type        : String;
        value       : String;
        expiresIn   : String;
        error       : String;
        http_header : Map; 
    }
    
 }


aspect MCPDiscovery {
   virtual tools : many {
        name        : String not null;
        description : String;
        inputSchema : Map not null;
        outputSchema : Map not null;
        annotations : Map ;
        _meta : Map not null;
    }
   virtual discoveryError : String;
}

 entity MCPResource {
    key     name        : String(100);
}

extend MCPResource with DestinationVirtual;

extend MCPResource with MCPDiscovery;
