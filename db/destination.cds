namespace sap.scai.debug;
//destination debug service, endpoints to query and to create destinations

// @odata.draft.enabled
// @cds.persistence.skip
entity Destinations {
    key     name        : String(100) not null;
    url                     : String;
    authentication          : String(100);
    proxyType               : String(100);
    sapClient               : String(1000);
    username                : String(1000);
    password                : String;
    isTrustingAllCertificates : Boolean;
    clientId                : String;
    clientSecret            : String;
    tokenServiceUrl         : String;
    tokenServiceUser        : String;
    tokenServicePassword    : String;
    type                    : String;
    isTestDestination       : Boolean;
    cloudConnectorLocationId: String;
    systemUser              : String;
    forwardAuthToken        : Boolean;
    mtls                    : Boolean;
    authTokens               : many {
        type        : String;
        value       : String;
        expiresIn   : String;
        error       : String;
        http_header : {
            name   : String; //replace key as it reserved word
            value : String;
        }; 
    }
 } 

entity DestinationVirtual {
    key     name        : String(100);
     
    virtual destination : {
                url                       : String;
                authentication            : String(100);
                proxyType                 : String(100);
                sapClient                 : String(1000);
                username                  : String(1000);
                password                  : String;
                isTrustingAllCertificates : Boolean;
                clientId                  : String;
                clientSecret              : String;
                tokenServiceUrl           : String;
                tokenServiceUser          : String;
                tokenServicePassword      : String;
                type                      : String;
                isTestDestination         : Boolean;
                cloudConnectorLocationId  : String;
                systemUser                : String;
                forwardAuthToken          : Boolean;
                mtls                      : Boolean;
                authTokens                : many {
                    type        : String;
                    value       : String;
                    expiresIn   : String;
                    error       : String;
                    http_header : Map; 
                }

            }
}

 