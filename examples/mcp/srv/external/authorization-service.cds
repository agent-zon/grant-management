/* checksum : 19dd58d48bbb7954e8debad500fe30df */
/**
 * OAuth 2.0 endpoints and metadata
 * 
 * Authorization Server endpoints for authorization, PAR, and token exchange with Rich Authorization Requests (RAR) support and grant_id propagation.
 */
@cds.external : true
@Common.Label : 'Authorization Server API'
service authorization_service {
  @cds.external : true
  function authorize_dialog(
    request_uri : LargeString default null,
    client_id : LargeString default null
  ) returns LargeString;

  @cds.external : true
  action authorize(
    request_uri : LargeString,
    client_id : LargeString
  ) returns LargeString;

  @cds.external : true
  action par(
    response_type : LargeString,
    client_id : LargeString,
    redirect_uri : LargeString,
    scope : LargeString,
    state : LargeString,
    code_challenge : LargeString,
    code_challenge_method : LargeString,
    grant_management_action : LargeString,
    grant_id : LargeString,
    authorization_details : LargeString,
    requested_actor : LargeString,
    subject_token_type : LargeString,
    subject_token : LargeString,
    subject : LargeString
  ) returns return_sap_scai_grants_AuthorizationService_par;

  @cds.external : true
  action token(
    grant_type : LargeString,
    client_id : LargeString,
    code : LargeString,
    code_verifier : LargeString,
    redirect_uri : LargeString
  ) returns return_sap_scai_grants_AuthorizationService_token;

  @cds.external : true
  action metadata() returns return_sap_scai_grants_AuthorizationService_metadata;

  @cds.external : true
  @cds.persistence.skip : true
  entity AuthorizationRequests {
    @Core.ComputedDefaultValue : true
    key ID : UUID not null;
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedAt}'
    createdAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedBy}'
    createdBy : String(255);
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedAt}'
    modifiedAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedBy}'
    modifiedBy : String(255);
    client_id : LargeString;
    redirect_uri : LargeString;
    request_uri : LargeString;
    scope : LargeString;
    state : LargeString;
    code_challenge : LargeString;
    code_challenge_method : LargeString;
    grant_management_action : LargeString;
    authorization_details : LargeString;
    requested_actor : LargeString;
    @Core.Computed : true
    expires_at : LargeString;
    @Core.Computed : true
    status : LargeString;
    response_type : LargeString;
    @Core.Computed : true
    risk_level : LargeString;
    subject_token_type : LargeString;
    subject_token : LargeString;
    /** {i18n>UserID.Description} */
    @Common.Label : '{i18n>UserID}'
    subject : String(255);
    expires_in : Integer;
    grant : Association to one Grants {  };
    grant_id : LargeString;
    consent : Association to one Consents {  };
    access : many AuthorizationRequests_access;
  };

  @cds.external : true
  @cds.persistence.skip : true
  entity Consents {
    @Core.ComputedDefaultValue : true
    key ID : UUID not null;
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedAt}'
    createdAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedBy}'
    createdBy : String(255);
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedAt}'
    modifiedAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedBy}'
    modifiedBy : String(255);
    @Common.FieldControl : #Mandatory
    key grant_id : LargeString not null;
    grant : Association to one Grants {  };
    request : Association to one AuthorizationRequests {  };
    request_ID : UUID;
    client_id : LargeString;
    scope : LargeString;
    authorization_details : Composition of many AuthorizationDetails {  };
    duration : Integer;
    /** {i18n>UserID.Description} */
    @Common.Label : '{i18n>UserID}'
    subject : String(255);
    previous_consent : Association to one Consents {  };
    previous_consent_ID : UUID;
    previous_consent_grant_id : LargeString;
    redirect_uri : LargeString;
    actor : LargeString;
  };

  @cds.external : true
  @cds.persistence.skip : true
  entity Grants {
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedAt}'
    createdAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedBy}'
    createdBy : String(255);
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedAt}'
    modifiedAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedBy}'
    modifiedBy : String(255);
    key id : LargeString not null;
    @Core.Computed : true
    client_id : LargeString;
    @Core.Computed : true
    risk_level : LargeString;
    @Validation.AllowedValues : [
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'active',
        Value: 'active'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'revoked',
        Value: 'revoked'
      }
    ]
    status : LargeString default 'active';
    @odata.Precision : 0
    @odata.Type : 'Edm.DateTimeOffset'
    revoked_at : DateTime;
    /** {i18n>UserID.Description} */
    @Common.Label : '{i18n>UserID}'
    revoked_by : String(255);
    /** {i18n>UserID.Description} */
    @Common.Label : '{i18n>UserID}'
    subject : String(255);
    actor : LargeString;
    scope : LargeString;
    consents : Composition of many Consents {  };
    requests : Composition of many AuthorizationRequests {  };
    authorization_details : Composition of many AuthorizationDetails {  };
  };

  @cds.external : true
  @cds.persistence.skip : true
  @UI.Identification : [ { $Type: 'UI.DataField', Value: name } ]
  entity AuthorizationDetailType {
    @Common.Label : '{i18n>Name}'
    name : String(255);
    @Common.Label : '{i18n>Description}'
    descr : String(1000);
    @Validation.AllowedValues : [
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'mcp',
        Value: 'mcp'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'fs',
        Value: 'fs'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'database',
        Value: 'database'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'api',
        Value: 'api'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'grant_management',
        Value: 'grant_management'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'file_access',
        Value: 'file_access'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'data_access',
        Value: 'data_access'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'network_access',
        Value: 'network_access'
      }
    ]
    key code : String(60) not null;
    template : LargeString;
    description : LargeString;
    @Validation.AllowedValues : [
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'low',
        Value: 'low'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'medium',
        Value: 'medium'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'high',
        Value: 'high'
      }
    ]
    riskLevel : LargeString;
    category : LargeString;
    texts : Composition of many AuthorizationDetailType_texts {  };
    localized : Association to one AuthorizationDetailType_texts {  };
  };

  @cds.external : true
  @cds.persistence.skip : true
  entity AuthorizationDetails {
    @Core.ComputedDefaultValue : true
    key ID : UUID not null;
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedAt}'
    createdAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Immutable : true
    @Core.Computed : true
    @Common.Label : '{i18n>CreatedBy}'
    createdBy : String(255);
    @odata.Precision : 7
    @odata.Type : 'Edm.DateTimeOffset'
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedAt}'
    modifiedAt : Timestamp;
    /** {i18n>UserID.Description} */
    @UI.HiddenFilter : true
    @UI.ExcludeFromNavigationContext : true
    @Core.Computed : true
    @Common.Label : '{i18n>ChangedBy}'
    modifiedBy : String(255);
    transport : LargeString;
    tools : cds_Map;
    server : LargeString;
    roots : many LargeString;
    permissions_read : Boolean;
    permissions_write : Boolean;
    permissions_execute : Boolean;
    permissions_delete : Boolean;
    permissions_list : Boolean;
    permissions_create : Boolean;
    databases : many LargeString;
    schemas : many LargeString;
    tables : many LargeString;
    urls : many LargeString;
    protocols : many LargeString;
    consent : Association to one Consents {  };
    consent_ID : UUID;
    consent_grant_id : LargeString;
    type : LargeString;
    locations : many LargeString;
    actions : many LargeString;
    identifier : LargeString;
    privileges : many LargeString;
    resources : many LargeString;
  };

  @cds.external : true
  @cds.persistence.skip : true
  entity AuthorizationDetailType_texts {
    @Common.Label : '{i18n>LanguageCode}'
    key locale : String(14) not null;
    @Common.Label : '{i18n>Name}'
    name : String(255);
    @Common.Label : '{i18n>Description}'
    descr : String(1000);
    @Validation.AllowedValues : [
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'mcp',
        Value: 'mcp'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'fs',
        Value: 'fs'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'database',
        Value: 'database'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'api',
        Value: 'api'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'grant_management',
        Value: 'grant_management'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'file_access',
        Value: 'file_access'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'data_access',
        Value: 'data_access'
      },
      {
        $Type: 'Validation.AllowedValue',
        @Core.SymbolicName: 'network_access',
        Value: 'network_access'
      }
    ]
    key code : String(60) not null;
  };

  @cds.external : true
  type AuthorizationRequests_access {
    server : LargeString;
    transport : LargeString;
    tools : cds_Map;
    locations : many LargeString;
    actions : many LargeString;
    permissions : AuthorizationRequests_access_permissions;
    roots : many LargeString;
    databases : many LargeString;
    schemas : many LargeString;
    tables : many LargeString;
    urls : many LargeString;
    protocols : many LargeString;
    type : Association to one AuthorizationDetailType {  };
    @Common.ValueList : {
      $Type: 'Common.ValueListType',
      Label: 'AuthorizationDetailType',
      CollectionPath: 'AuthorizationDetailType',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: type_code,
          ValueListProperty: 'code'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        }
      ]
    }
    type_code : String(60);
  };

  @cds.external : true
  @open : true
  type cds_Map { };

  @cds.external : true
  type AuthorizationRequests_access_permissions {
    read : sap_scai_grants_RARClaim;
    write : sap_scai_grants_RARClaim;
    delete : sap_scai_grants_RARClaim;
    execute : sap_scai_grants_RARClaim;
    list : sap_scai_grants_RARClaim;
    create : sap_scai_grants_RARClaim;
  };

  @cds.external : true
  type sap_scai_grants_RARClaim {
    essential : Boolean;
  };

  @cds.external : true
  type return_sap_scai_grants_AuthorizationService_par {
    request_uri : LargeString;
    expires_in : Integer;
  };

  @cds.external : true
  type return_sap_scai_grants_AuthorizationService_token {
    access_token : LargeString;
    token_type : LargeString;
    expires_in : Integer;
    scope : LargeString;
    grant_id : LargeString;
    actor : LargeString;
    authorization_details : many sap_scai_grants_AuthorizationDetailRequest;
  };

  @cds.external : true
  type sap_scai_grants_AuthorizationDetailRequest {
    server : LargeString;
    transport : LargeString;
    tools : cds_Map;
    locations : many LargeString;
    actions : many LargeString;
    permissions : sap_scai_grants_AuthorizationDetailRequest_permissions;
    roots : many LargeString;
    databases : many LargeString;
    schemas : many LargeString;
    tables : many LargeString;
    urls : many LargeString;
    protocols : many LargeString;
    type_code : String(60);
  };

  @cds.external : true
  type sap_scai_grants_AuthorizationDetailRequest_permissions {
    read : sap_scai_grants_RARClaim;
    write : sap_scai_grants_RARClaim;
    delete : sap_scai_grants_RARClaim;
    execute : sap_scai_grants_RARClaim;
    list : sap_scai_grants_RARClaim;
    create : sap_scai_grants_RARClaim;
  };

  @cds.external : true
  type return_sap_scai_grants_AuthorizationService_metadata {
    issuer : LargeString;
    authorization_endpoint : LargeString;
    token_endpoint : LargeString;
    pushed_authorization_request_endpoint : LargeString;
    authorization_details_types_supported : LargeString;
    grant_types_supported : LargeString;
    response_types_supported : LargeString;
    code_challenge_methods_supported : LargeString;
  };
};

