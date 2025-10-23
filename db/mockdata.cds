using sap.scai.grants as grants from './grants.cds';


annotate grants.Grants with {
    id @Mockdata: {string:'uuid'};
    client_id @Mockdata: {internet: 'domainName'};
    createdAt @Mockdata: {date: 'past'};
    modifiedAt @Mockdata: {date: 'recent'};
    modifiedBy @Mockdata: {person: 'fullName'};
   

}


 