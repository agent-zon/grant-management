
# App-to-App flows
IAS supports three flows for obtaining a token for App-to-App communication.

###### Technical Communication
1. The sender application makes a client credentials request to the token endpoint of the IAS consumer tenant. The sender authenticates with its own OAuth Client ID at IAS using client credentials, like X.509 client certificate authentication.
   In the request, the sender passes the following parameters:
    1. client_id = client id of the IAS application
    2. grant_type = The value "client_credentials" as defined by the RFC.
    3. resource = (defined by [RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)) URN with the logical name (App Name) of the receiving application or the concrete OAuth client ID. That name is tenant independent (thus can be “hardcoded” into the sender) and will be used by IAS to identify the intended receiver application. Allowed values are `urn:sap:identity:application:provider:clientid:<client_id>`
       or `urn:sap:identity:application:provider:name:<app_name>`
    4. apptid: tenant identifier (required when multiple subscriptions exist)

   To support legacy scenarios, client secrets is also supported by IAS, but the usage is discouraged.

2. IAS performs the appropriate validation procedures and issues back a token in response. The validity criteria include (but not only):
    1. ensure the sender is allowed to call the receiver.

   A token is issued only if the validation succeeded.

   As defined by the RFC, the response is a normal OAuth 2.0 response.
   The issued token is а JWT (OIDC-like) token that can be used as a Bearer token to call the receiver app. The token contains at least the following claims:

    2. sub – Identifying the client ID of the sender application.
    3. azp – The client ID of the sender app that requested the token.
    4. aud – The client ID of the application that is intended to receive the token.
    5. plans – list of plans selected as consumed service.
    6. IAS standard claims – any standard (e.g. cnf) or custom claims defined by the application.

   The token might contain also additional application-specific claims the receiver expects and that are known to IAS, e.g. the tenant name/ID of the concrete receiver application.

   The token is not bound to a concrete resource to be called on the receiver side. Whether the sender is authorized to call a given resource/API, is subject to sender authorizations at the receiver side.

###### Named user Communication for consumer having an access or ID Token
1. The sender application makes a jwt bearer request to the token endpoint of consumer IAS. The sender authenticates
   with its own OAuth Client ID at IAS using e.g. client certificate authentication ([IAS documentation](https://help.sap.com/docs/IDENTITY_AUTHENTICATION/6d6d63354d1242d185ab4830fc04feb1/01a0440acd1648189644a2ff60f3772f.html?q=jwt)). In the request, the sender passes the following parameters:
    1. client_id = client id of the IAS application. credentials = used for authenticating the client, e.g. mTLS
    2. grant_type = The value "urn:ietf:params:oauth:grant-type:jwt-bearer" as defined by the RFC.
    3. resource = (defined by [RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)) URN with the logical name (App Name) of the receiving application or the concrete OAuth client ID. That name is tenant independent (thus can be “hardcoded” into the sender) and will be used by IAS to identify the intended receiver application. Allowed values are `urn:sap:identity:application:provider:clientid:<client_id>`
       or `urn:sap:identity:application:provider:name:<app_name>`   4. assertion = Contains the ID token representing the principal to be propagated
        1. tid: tenant identifier (required when multiple subscriptions exist)

2. IAS performs the appropriate validation procedures and issues back a token in response. The validity criteria include (but not only):
    1. ensure the sender is allowed to call the receiver.

   A token is issued only if the validation succeeded.

   As defined by the RFC, the response is a normal OAuth 2.0 response. The issued token is а JWT (OIDC-like) token that can be used as a Bearer token to call the receiver app. The token contains at least the following claims:
    2. sub – User identifier as configured for Receiver. The subject value MAY be used by the receiver app to identify the user in the local user store if available.
    3. azp – The client ID of the sender app that requested the token.
    4. aud – The client ID of the application that is intended to receive the token.
    5. plans – list of plans selected as consumed service.
    6. IAS standard claims – any standard (e.g. cnf) or custom claims defined by the application.

   To support legacy scenarios, client secrets is also supported by IAS, but the usage is discouraged.

   The token might contain also additional application-specific claims the receiver expects and that are known to IAS, e.g. the tenant name/ID of the concrete receiver application.

   The token is not bound to a concrete resource to be called on the receiver side. Whether the sender is authorized to call a given resource/API, is subject to sender authorizations at the receiver side.

###### Named user Communication for consumer having an SAML session identifier

IAS supports obtaining an OIDC token based on an SAML session as defined in
[SAML Session Index as new subject_token_type for OAuth 2.0 Token Exchange Grant for IAS](https://sap.sharepoint.com/:b:/r/teams/CPASecurity/Shared%20Documents/WG%20IAM/40_Workstreams/WS%20Authentication/System-to-system%20Access%20-%20Concept%20for%20TG02.R5/IAM_ADR_SAML_TO_OIDC_TOKEN_EXCHANGE_v1.2.pdf?csf=1&web=1&e=clXHnY)

Using the OIDC token, it can be used for [app-to-app
communication using a jwt-bearer](./README.md#named-user-communication-for-consumer-having-an-access-or-id-token) flow.