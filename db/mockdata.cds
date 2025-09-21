using com.sap.agent.grants as grants from './schema.cds';


annotate grants.Grants with {
    ID @Mockdata: {string:'uuid'};
    clientId @Mockdata: {internet: 'domainName'};
    expiresAt @Mockdata: {date: 'future'};
    createdAt @Mockdata: {date: 'past'};
    modifiedAt @Mockdata: {date: 'recent'};
    modifiedBy @Mockdata: {person: 'fullName'};
    lastUsed @Mockdata: {date: 'recent'}; 
    sessionId @Mockdata: {string: 'uuid'};
    ip @Mockdata: {internet: 'ipv4'};
   

}

annotate grants.Identity with {
    ID @Mockdata: {string: 'uuid'};
    type @Mockdata: {enumValue: {user:0, agent:1, system:2, device:3}};
    createdAt @Mockdata: {date: 'past'};
    modifiedBy @Mockdata: {date: 'past'};
}

annotate grants.AgentIdentity with {
    ID @Mockdata: {string: 'uuid'};
    type @Mockdata: {enumValue: {agent:0}};
    createdAt @Mockdata: {date: 'past'};
    modifiedBy @Mockdata: {date: 'past'};
    name @Mockdata: {person: 'fullName'};
    url @Mockdata: {internet: 'url'};
    publicKey @Mockdata: {internet: 'uuid'};
    instanceId @Mockdata: {internet: 'uuid'};
}

annotate grants.UserIdentity with {
    ID @Mockdata: {string: 'uuid'};
    type @Mockdata: {enumValue: {user:0}};
    createdAt @Mockdata: {date: 'past'};
    modifiedBy @Mockdata: {date: 'past'};
    name @Mockdata: {person: 'fullName'};
    email @Mockdata: {internet: 'email'};
    phone @Mockdata: {phone: 'number'};
    address @Mockdata: {location: 'streetAddress'};
}

annotate grants.DeviceIdentity with {
    ID @Mockdata: {string: 'uuid'};
    type @Mockdata: {enumValue: {device:0}};
    createdAt @Mockdata: {date: 'past'};
    modifiedBy @Mockdata: {date: 'past'};
    name @Mockdata: {person: 'fullName'};
    user_agent @Mockdata: {internet: 'userAgent'};
    ip @Mockdata: {internet: 'ipv4'};
}

 