# Identity Broker

The Identity service of SAP BTP enables you to delegate authentication to the Identity Authentication service. The Identity service automates the creation of OpenID Connect (OIDC) applications for the Identity Authentication service for each application the Identity service registers.

The Identity service of SAP BTP enables you to realize authentication for applications built with SAP BTP regardless of whether your application resides in an environment of SAP BTP or not. While you can manually configure an application of the Identity Authentication service to serve the function of an OIDC provider, the Identity service automates this process. You can preconfigure aspects of the Identity Authentication application, such as the display name of the application and redirect URIs. The Identity service enables an application to exchange information such as URL and credentials with the application of the Identity Authentication tenant.

## Preconditions
### Setup Trust

The service broker requires that there is trust between your subaccount and an IAS tenant. See [Configuring IAS](../010-Getting-Started/00-Configuring-IAS.md) for more information.

### Entitlements

Assign entitlements for *SAP Cloud Identity Services* in order to make the service visible in your subaccount.

## Go-Live considerations
> **⚠  Before you go live with a multi tenant application**  
> **Client authentication**: `client secret` authentication is forbidden for multi-tenant service instance, therefore, use mTLS for client authenticate with a stable subjectDN. 
> - IAS needs up to 24h for replicating between different DCs, therefore a stable SubjectDN is mandatory.
> - When using X509_GENERATED, you need to specify the [app-identifier](#service-binding-creation) parameter.
> 
> **Display Name**: Please specify the display name with your product name, so customers are able to identify the application in the IAS admin console.
> 
> **Application Name**: If a multi-tenant application is deployed to several BTP landscapes (e.g. eu10, eu20 ...) it might be hard to distinguish the  provider applications in IAS, as they all share the same display name. In this case you can set an unique application name (`name` parameter) to make them easily identifiable.
> 
> **Attribute Mappings**: Check the [Attribute Mapping Guidelines](#attribute-mappings-for-multi-tenant-applications) for multi-tenant apps.
>
> **Expect delays**: When changing parameters (e.g. redirect URI), expect 24h delay for replication to all IAS data centers. For testing, please also use IAS tenants in another datacenter than Rot.
> 
> **Testing**: While for development-specific tests you probably used a test IAS Tenant in datacenter Rot/Amsterdam, before going live please also use an IAS tenant in another datacenter than Rot/Amsterdam as consumer tenant for testing to also cover replication effects.
> 
> **Credentials Rotation**: In general the credential rotation happens during [binding](#service-binding-parameters) triggered when you deploy your application. For this a best practice is to have frequent deployments / credential rotation and longer validity of certificates to avoid cases in which you have downtimes due to expired credentials.  
If you cannot ensure frequent / regular deployments, please use `X509_ATTESTED` as documented in the [respectivee chapter](#service-binding-parameters).  


## Limitations
* Before a service instance can be subscribed it can take up to 24hours until the required data is replicated to other datacenters. To check if the provider/consumer IAS tenants are in different datacenters (and therefore replication is required), you can compare the `X-IDS-Landscape` response header (e.g. eu-de-1) when opening the tenant (https://\<tenantId\>.accounts400.ondemand.com) via browser developer tools. This also affects **configuration updates** like redirect uris or certificates, thus a new certificate with different ``subject dn`` can only be used for a different DC after replication took place. **Therefore, certificate rotation with stable subject dn is recommended by either using X509_PROVIDED, X509_ATTESTED or X509_GENERATED with configured app-identifier.**
* Maximum of 1000 subscriptions/instances per IAS tenant of the same application
* Currently not available in
  * AliCloud, NS2, private cloud
  * Planned with https://jira.tools.sap/browse/SECREQ-36 (ALI)
  and  https://jira.tools.sap/browse/SECREQ-37 (NS2)

## Service Instance Creation
Cloud Foundry:

```shell
cf create-service identity application myIdentityService [-c <parameters file>]
```

Service Manager:

```shell
smctl provision provider identity application [-c "<json parameter data>"] 
```

Note: The parameters are optional. All service instances are created asynchronously.

### Service Instance Parameters

```json
{
    "name": "sap-product-technical-name",
    "oauth2-configuration": {
        "redirect-uris": ["https://myapp.mydomain.com/callback/**"],
        "post-logout-redirect-uris": ["https://myapp.mydomain.com/logout/**"],
        "front-channel-logout-uris": ["https://myapp.mydomain.com/fc-logout"],
        "back-channel-logout-uris": ["https://myapp.mydomain.com/bc-logout"],
        "public-client": false,
        "token-policy": {
            "token-validity": 1800,
            "refresh-validity": 7776000,
            "refresh-parallel": 3,
            "refresh-usage-after-renewal": "off",
            "access-token-format": "default"
        },
        "grant-types": ["client_credentials", "authorization_code"],
    },
    "authorization": {
      // Please see https://github.wdf.sap.corp/pages/CPSecurity/ams-docu/docs/HowTo_AMSConfig#create-an-ias-service-instance-with-ams-enabled
    },
    "consumed-services": [{
        "service-instance-name": "al4webapp"
    }],
    "xsuaa-cross-consumption": true,
    "display-name" : "SAP Product Name",
    "home-url" : "https://$BTP_SUBDOMAIN.cfapps.sap.hana.ondemand.com",
    "multi-tenant": true,
    "user-access": "private",
    "catalog": {
        "services": [{
            "name": "reuse-service",
            "plans": [{
                "name": "reuse-plan"
            }]
        }]
    },
    "subject-name-identifier": {
        "attribute": "userUuid",
        "fallback-attribute": "uid"
    },
    "provided-apis": [{
        "name": "write-access",
        "description": "grants access to write APIs",
        "type": "public"
    }],
    "default-attributes": {"app_att": "123"},
    "assertion-attributes": {"email": "mail", "groups":"companyGroups"},
    "blank-attribute-names": ["predefined-attribute"],
    "additional-domains": ["accounts400.sap.com"]
}
```
- name
  - String, name of the application created in IAS
  - Must be unique per tenant
  - If not provided, the service instance id is used
- redirect-uris
    - Array of allowed redirect URIs that are whitelisted and can be used for authcode flow, see [the complete documentation for the redirect URIS in IAS](https://help.sap.com/viewer/6d6d63354d1242d185ab4830fc04feb1/Cloud/en-US/1ae324ee3b2d4a728650eb022d5fd910.html)
    - The character `*` is allowed as placeholder
    - Domain relaxation is supported and must be added explicitly 
       `https://*.application.cfapps.sap.hana.ondemand.com`
    - Arbitrary path matching is supported and must be added explicitly
       `https://myapp.application.cfapps.sap.hana.ondemand.com/**`
- post-logout-redirect-uris
    - Array of allowed redirect URIs that are whitelisted and can be used for redirection after oidc logout. Wildcards are handled the same way as for *redirect-uris*
- front-channel-logout-uris
  - Array of front channel logout URIs which will be requested in a logout flow
  - The character `*` is allowed as placeholder which allows to dynamically register a URI with the `logout_uri` parameter in authorize requests, for example: when you configure `https://*.example.com/logout` you can register `https://app1.example.com/logout`
- back-channel-logout-uris
  - Array of back channel logout URIs which will be requested in a logout flow.
  - The back channel logout URI must be an absolute URI which may include an application/x-www-form-urlencoded formatted query component.
  - The back channel logout URI must not include a fragment component.
- public-client
    - If set to true, enables PKCE flow for the application, where the client does not need to provide a credential.
- token-policy
    - Defines token policy for IAS application
    - token-validity: id and access token validity in seconds, defaults to 1 hour (min. 1 minute, max. 12 hours).
    - refresh-validity: refresh token validity in seconds, defaults to 12 hours (setting to 0 disables refresh token, max. 180 days).
    - refresh-parallel: max. allowed number of refresh tokens being active at the same time, defaults to 1 (max. 10).
    - refresh-usage-after-renewal: defines the validity of the old refresh token after requesting a new one through refresh token grant type.
	Three different values are allowed:
		- off: The new refresh token immediately invalidates the old one.
		- online: The new refresh token is created and the old one is still active for 5 minutes.
		- mobile: The new and old refresh token are valid during the configured refresh token life time.
  - access-token-format: defines the format of access tokens. Three different values are allowed:
    - default: access token format is grant-type-dependent (see [here](https://help.sap.com/docs/identity-authentication/identity-authentication/token-policy-configuration-for-applications?version=Cloud))
    - jwt: access token format will be JWT
    - opaque: access token format will be opaque
- grant-types
	- list of enabled grant types. Valid values are: "client_credentials", "password",
                "urn:ietf:params:oauth:grant-type:jwt-bearer", "authorization_code", "implicit", "refresh_token",
                "urn:ietf:params:oauth:grant-type:token-exchange", "authorization_code_pkce_s256". Non-default are implicit, token-exchange and pkce.
- consumed-services
    - Service instance names of reuse service instances (Services that are implemented using [Reuse Services](#Reuse-Services)) whose APIs should be consumed. Results in adding the client ids of these instances to the audience field in the token
- xsuaa-cross-consumption
    - Boolean, defaults to false
    - Adds the clientId of the IAS application created by XSUAA to the audience in the token. This enables token exchange from IAS token to XSUAA token and therefore cross consumption of XSUAA services.
- multi-tenant
    - Boolean, defaults to false
    - Enables the service instance as multi-tenant which is required if the service instance should be subscribed or be used for a reuse service. Important: The IAS tenant must be enabled for multi-tenant applications!
- user-access
  - String, specify which users are authorized to log on to the application.
  - Only one of the following values is possible: public, internal or private.
- catalog
    - Defines services and plans that should be provided to its reuse service instances (see [Reuse Services](#Reuse-Services))
    - Requires that `multi-tenant` is set to true
- display-name
    - String, display-name of the application created in IAS
    - If not provided, the name from the `cf create-service` command is used
- home-url
  - String, home-url of the application created in IAS. 
  - The home-url is also set for subscriptions of the instance.
  - This property can accept `$BTP_SUBDOMAIN` as a placeholder which will be interpreted as customer subaccount subdomain - this placeholder is only accepted for subaccounts that are based on feature set B.
- subject-name-identifier
    - The `attribute` used to fill the subject claim in the token, defaults to `userUuid`.
    - `fallback_attribute` used to fill the subject claim in the token incase the `attribute` is not defined for user. On default it is not configured.
    - Possible values for both attributes are: `userUuid, uid, mail, displayName, loginName, personnelNumber`. Furthermore, `attribute` supports dynamic values and `fallback-attribute` can be set to `none`.
- provided-apis
    - name: name of the provided API which should be unique.
    - description: description of the provided API.
    - type: type of the provided API:
      - public: APIs that shall be configured as consumed-api by customers (IAS administrators).
      - internal: APIs that shall be only configured as consumed-api by SAP provisioning tools.
    - Configures the provided apis that can be consumed by other IAS applications for API access of your application. See [app-to-app](https://github.wdf.sap.corp/CPSecurity/Knowledge-Base/blob/master/06_Architecture/Identity_Service/ias-multi-tenancy/app-to-app.MD).
    - To enable `Allow all APIs for principal propagation` you can add an api with name `principal-propagation`
- default-attributes:
	- Configures the default attributes of the application: The keys of the map will be the attribute name in the token, the corresponding value will be the value of the attribute in the token. See [Attribute Mapping Guidelines](#attribute-mappings-for-multi-tenant-applications) for multi-tenant apps.
- assertion-attributes:
	- Configures the assertion attributes of the application: The keys of the map will be the attribute name in the token, the corresponding value is the name of the userattribute that is used to resolve the value of the attribute. See [Attribute Mapping Guidelines](#attribute-mappings-for-multi-tenant-applications) for multi-tenant apps.
	-  On default these assertion-attributes are set: `{"groups":"companyGroups", "given_name":"firstName", "family_name":"lastName", "email":"mail", "user_uuid":"userUuid"}.`
	-  Valid values can be found [in the IAS SAP help documentation](https://help.sap.com/docs/identity-authentication/identity-authentication/configure-default-attributes-sent-to-application?locale=en-US) (click "Supported Attributes Expand to see the attributes that can take dynamic values" to open table, valid values are in the Attribute Technical Name column)
- blank-attribute-names:
	- Declare application attributes without a mapping to any value: The entries of the array will be the displayed as unconfigured application attributes for application references.
- additional-domains: domains that should be added to the binding information

## Service Binding Creation
`cf bind-service myTestApp myIdentityService [-c parameters]`

Whereby the parameters are optional. Bindings can be created asynchronously or synchronously. The number of bindings is limited to 100 per instance (however, only 20 secrets and 20 different certificate subjects are supported by IAS).

### Service Binding Parameters

By default, binding credential will be a client secret.
When binding, the credential type can be chosen by providing the following parameters:

```json
{"credential-type": "SECRET"}
```

or

```json
{"credential-type": "X509_PROVIDED", "certificate": "-----BEGIN CERTIFICATE-----\nMIID6zC...\n-----END CERTIFICATE-----"}
```

or 

```json
{"credential-type": "X509_GENERATED", "key-length": 2048, "validity": 30, "validity-type": "DAYS", "app-identifier":"microservice1"}
```

or 

```json
{"credential-type": "X509_ATTESTED", "app-identifier":"microservice1", "api-domain":"example.hcp.germanywestcentral.azmk8s.io"}
```

or

```json
 {"credential-type": "JWT_CLIENT_AUTH", "issuer": "https://mytenant.accounts.ondemand.com", "subject": "5fd2be25-0e09-4321-8817-4a7b11a2ace2"}
```

or

```json
 {"credential-type": "NONE"}
```

The following credential types are supported:
- `SECRET`: generates a client secret, `SECRET` is the default value if no parameters are provided - this credential type is forbidden for multi-tenant service instance. 
- `X509_PROVIDED`: creates a binding using the provided certificate, which can then be used to request tokens. The newlines 
after `-----BEGIN CERTIFICATE-----` and before `-----END CERTIFICATE-----` cannot be omitted (see example above). **Important**, the certificate must be unqiue per IAS tenant.
- `X509_GENERATED`: generates a private-key and a signed certificate which is added to IAS application. Returns both, the private key and the certificate. The certificate contains the client certificate and the intermediate certificates (seperated by newlines). On default the certificate is valid for 30 days and the key-length is 2048.

The certificate generation can be modified by several optional paramaters. `key-length` (possible values are 2048 and 4096) is used to modify the private key length, the certificate lifetime ist configured via `validity-type` and `validity` (possible values for `validity-type` are `DAYS`, `MONTHS`, `YEARS`). The `app-identifier` enables you to generate certificate with stable subject (for the same instance). Therefore, this can be used to ease the certificate rotation of your microservice while keeping stable subject. Maximum length of `app-identifier` is 20 characters. `app-identifier` is required for multi-tenant instances.
- `X509_ATTESTED`: Configures the certificate provided by [Zero Trust Identity Service (ZTIS)](https://pages.github.tools.sap/pse/pse-docs/docs/identity) to the application. The `app-identifier` can be used to obtain a certifcate with stable subject. `app-identifier` is required for multi-tenant instances and bindings on k8s. Additionaly, bindings on k8s required the `api-domain` which is the fully qualified domain name of kubernetes api server without http/s schema.
- `JWT_CLIENT_AUTH`: configures a credential for JWT client authentication defined by https://datatracker.ietf.org/doc/html/rfc7523#section-2.2. `issuer` and `subject` define the expected issuer/subject of the token used for client authentication.
- `NONE`: no credentials are added to the binding, only information like url and app_tid (formerly zone). typically used together with instance that is set to public so that no credential is required for login.

### Command Line Utility

:information_source: Most of the command line examples given below can
be generated based on a service key using [identity-broker-util.sh](./identity-broker-util.sh)

The script assumes the utility *jq* to be installed (Mac OS: `brew install jq`, Ubuntu: `sudo apt-get install jq`).
```
identity-broker-util.sh <file with service-key json>
```

## Reuse Services
Reuse services should generally be developed if you want to expose an API to be consumed by another party (e.g. application) and the lifecycle of this consumption is controlled by the consuming entity.
You'd provide thus to your consumers the possibility to create instances of your service that can be consumed via `consumed-services` in order to model this dependency.
This dependency relation defines which services are notified via subscription callbacks when a new application tenant is onboarded and how OIDC tokens can be forwarded between entities.

There are two approaches to create a reuse service, either by registering the broker created in identity directly or creating a custom broker.
It's recommended to register the broker created in identity directly whenever possible as this avoids the need to develop and operate an own broker component. 
For this the [auto_subscription](https://int.controlcenter.ondemand.com/index.html#/knowledge_center/articles/8f9b9b8d5e3d4e4f92685605ff098e49) feature of service manager
can be leveraged, in order to receive subscription callbacks on instance creation. Furthermore, [reuse instance binding](#reuse-instance-binding) can be leveraged to let identity broker add static binding data like a
service url.

If the service requires creation of binding data with dynamic data, the service requires additional parameters, or the service needs to react on provisioning events but is not able to use `auto_subscription`,
a custom broker must be created.

### Setup
As mentioned in [Instance Parameters](#Parameters), a service instance can be parameterized with a catalog definition.
This catalog can then be exposed via a service instance specific `osb_url`.

Steps are:
#### Create Provider Instance

Create a default service instance with a catalog that contains the services and plans you want to provide to the reuse services. 

- Either only provide the service and plan names, then the broker will generate the IDs and provides you with a basic catalog. This is recommended for development and testing, as it does not require to write the complete catalog yourself.

- Provide a complete catalog with IDs which will be returned when the catalog of the reuse service is queried. It is recommended to use this catalog for productive use cases, as it guarantees stable IDs and allows full flexibility about the catalog definition.
All attributes that are defined in this [model](https://github.com/spring-cloud/spring-cloud-open-service-broker/blob/master/spring-cloud-open-service-broker-core/src/main/java/org/springframework/cloud/servicebroker/model/catalog/Catalog.java) can be used.
**Important**: All service/plan ids must be set if a complete catalog should be returned.
- The following features require a complete catalog:
    - [reuse instance bindings](#reuse-instance-binding)
    - [subscribe_with_consuming_app](#service-ui)

Example:
```
cf create-service identity application ias-reuse-broker -c '{"catalog":{"services":[{"name": "reuse-service", "plans": [{"name": "reuse-plan"}]}]}, "multi-tenant":true}'
```

<details>
<summary>Example of a complete catalog</summary>

```json
{
    "services": [
        {
            "id": "d7979dcb-5848-4bd1-8061-7cf604ff1f22",
            "name": "icecream",
            "description": "SAP Ice Cream Service",
            "bindable": true,
            "plan_updateable": false,
            "instances_retrievable": true,
            "bindings_retrievable": true,
            "plans": [
                {
                    "id": "1e3a84dd-8ce7-4323-9ca1-53883af6cd22",
                    "name": "chocolate",
                    "description": "Delivers chocolate ice cream",
                    "bindable": false,
                    "free": true,
                    "metadata": {
                        "supportedMaxOSBVersion": "2.15",
                        "supportedMinOSBVersion": "2.11"
                    }
                },
                {
                    "id": "2f5c23ee-1ce6-6139-4af4-26461bc6ef79",
                    "name": "vanilla",
                    "description": "Delivers vanilla ice cream",
                    "bindable": true,
                    "free": true,
                    "metadata": {
                        "supportedMaxOSBVersion": "2.15",
                        "supportedMinOSBVersion": "2.11",
                        "bindingData": {
                            "url": "https://vanilla.service.sap.com",
                            "custom": "custom-value"
                        }
                    }
                }
            ],
            "tags": [],
            "metadata": {
                "displayName": "SAP Ice Cream",
                "documentationUrl": "https://help.sap.com/ice-cream",
                "imageUrl": "data:image/svg+xml;base64,PHN2ZyBpZD0ic2FwLWNsb3VkLWlkZW50aXR5LXNlcnZpY2UiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDU2IDU2Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzBhNmVkMTt9LmNscy0ye2ZpbGw6IzA1M2I3MDt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPnNhcC1jbG91ZC1pZGVudGl0eS1zZXJ2aWNlPC90aXRsZT48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yNi4xNTEsMzEuNmEzLjc0OCwzLjc0OCwwLDAsMC0xLjItLjgwNkEzLjY3LDMuNjcsMCwwLDAsMjMuNSwzMC41SDE5Ljc1YTMuNjQsMy42NCwwLDAsMC0xLjQ2NS4yOTNBMy43OTQsMy43OTQsMCwwLDAsMTcuMSwzMS42YTMuNzQ4LDMuNzQ4LDAsMCwwLS44MDYsMS4yQTMuNjcsMy42NywwLDAsMCwxNiwzNC4yNVYzOEgyNy4yNVYzNC4yNWEzLjY3LDMuNjcsMCwwLDAtLjI5My0xLjQ1QTMuNzQ4LDMuNzQ4LDAsMCwwLDI2LjE1MSwzMS42WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI0LjI3NiwyOS40YTMuNzk0LDMuNzk0LDAsMCwwLC44MDYtMS4xODYsMy43NzIsMy43NzIsMCwwLDAsMC0yLjkxNSwzLjc0NSwzLjc0NSwwLDAsMC0yLjAwNy0yLjAwNywzLjc3MiwzLjc3MiwwLDAsMC0yLjkxNSwwLDMuNzk0LDMuNzk0LDAsMCwwLTEuMTg2LjgwNiwzLjc0OCwzLjc0OCwwLDAsMC0uODA2LDEuMiwzLjc3MiwzLjc3MiwwLDAsMCwwLDIuOTE1LDMuODI2LDMuODI2LDAsMCwwLDEuOTkyLDEuOTkyLDMuNzcyLDMuNzcyLDAsMCwwLDIuOTE1LDBBMy43NDgsMy43NDgsMCwwLDAsMjQuMjc2LDI5LjRaIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzkuNzA3LDMyLjhBMy43NDUsMy43NDUsMCwwLDAsMzcuNywzMC43OTNhMy42NywzLjY3LDAsMCwwLTEuNDUtLjI5M0gzMi41YTMuNjQsMy42NCwwLDAsMC0xLjQ2NS4yOTMsMy43OTQsMy43OTQsMCwwLDAtMS4xODYuODA2LDMuNzQ4LDMuNzQ4LDAsMCwwLS44MDYsMS4yLDMuNjUyLDMuNjUyLDAsMCwwLS4yOTMsMS40NVYzOEg0MFYzNC4yNUEzLjY3LDMuNjcsMCwwLDAsMzkuNzA3LDMyLjhaIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzcuMDI2LDI5LjRhMy43OTQsMy43OTQsMCwwLDAsLjgwNi0xLjE4NiwzLjc3MiwzLjc3MiwwLDAsMCwwLTIuOTE1LDMuNzQ1LDMuNzQ1LDAsMCwwLTIuMDA3LTIuMDA3LDMuNzcyLDMuNzcyLDAsMCwwLTIuOTE1LDAsMy43OTQsMy43OTQsMCwwLDAtMS4xODYuODA2LDMuNzQ4LDMuNzQ4LDAsMCwwLS44MDYsMS4yLDMuNzcyLDMuNzcyLDAsMCwwLDAsMi45MTUsMy44MjYsMy44MjYsMCwwLDAsMS45OTIsMS45OTIsMy43NzIsMy43NzIsMCwwLDAsMi45MTUsMEEzLjc0OCwzLjc0OCwwLDAsMCwzNy4wMjYsMjkuNFoiLz48cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik00NS44NCwyMy45NjJhOC40ODksOC40ODksMCwwLDAtMTIuNzgzLTUuNzEzQTExLjU1NSwxMS41NTUsMCwwLDAsMjIuNDEsMTFDOS42MzUsMTEsMTEuMDksMjMuOTg4LDExLjA5LDIzLjk4OEExMC4yNTcsMTAuMjU3LDAsMCwwLDE0LjI4NSw0NEg0MS41YTEwLjQ4NiwxMC40ODYsMCwwLDAsNC4zNC0yMC4wMzhaTTQxLjUsNDFIMTQuMjg1YTcuMjU3LDcuMjU3LDAsMCwxLTIuMjU4LTE0LjE2MmwyLjI3OS0uNzY4LS4yMzItMi4zODljMC0uMDQyLS4zNzktNC4yMzcsMi4wMS03LjAxMywxLjM3Ny0xLjYsMy41MjQtMi41LDYuMzgxLTIuNjY2YTkuMjA5LDkuMjA5LDAsMCwxLDcuOTk0LDUuMzM5bDEuMTc2LDIuODcxLDIuNDI0LTEuMzE4QTcuNiw3LjYsMCwwLDEsMzcuNDQ5LDIwYTUuNTQ2LDUuNTQ2LDAsMCwxLDUuNDQzLDQuNTE4bC4yODgsMS41MjgsMS40MTUuNjQ2QTcuNDg2LDcuNDg2LDAsMCwxLDQxLjUsNDFaIi8+PC9zdmc+",
                "longDescription": "SAP Ice Cream Service."
            },
            "requires": []
        }
    ]
}
```
</details>

#### Create Provider Binding
Bind your service instance with a x509 binding (or create a service key). This binding contains a `osb_url` that can be used to register your broker at the service manager.
In the example `X509_GENERATED` is used to let identity generate the certificate, but also `X509_PROVIDED` can be used to provide a certificate.

Example:
```
cf create-service-key ias-reuse-broker key -c '{"credential-type": "X509_GENERATED"}'
```
Example Result:
```json
{
 "certificate": "-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----",
 "key": "-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----",
 "clientid": "f5abb300-d146-4e75-9868-f3690678922c",
 "osb_url": "https://eu-osb.accounts400.ondemand.com/sap/cp-kernel/identity/v1/osb/209a0132-a0b7-4a9b-b170-0b4de8bef598",
 "url": "https://xs2security.accounts400.ondemand.com"
}
```
You could now query the catalog of your reuse service broker to verify that the services and plans are correct. Note, you may have to replace the `\n` characters to newlines using: `awk '{gsub(/\\n/,"\n")}1' <file>.pem`
```shell
curl --cert cert.pem --key key.pem https://eu-osb.accounts400.ondemand.com/sap/cp-kernel/identity/v1/osb/209a0132-a0b7-4a9b-b170-0b4de8bef598/v2/catalog
```
   
#### Create custom Broker (Optional)
   
If your use case requires a custom broker (check [here](#reuse-services) if it's really required), the provisioning and deprovisioning calls must be forwarded from the custom broker to the identity broker using the
`osb_url` and `certificate` from the binding.
Furthermore, it's recommended to forward the catalog calls so that the catalog can be maintained in a single place inside identity broker.

**Important**: Do not modify the context before forwarding the request to identity broker as otherwise the context signature check will fail and you request will be declined.

To ease the creation of custom brokers [Node SBF](https://github.wdf.sap.corp/xs2/node-sbf) added support for identity.

Custom brokers should work asynchronous like the identity broker and the following behaviour is expected:
- [Provisioning](https://github.com/openservicebrokerapi/servicebroker/blob/v2.16/spec.md#provisioning):
  After the custom broker validated the request (e.g. parameters are valid) the request should be forwarded to identity broker.
  If identity broker accepts the request, the custom broker can return `accepted` to service manager. In case it failed, the custom broker should do a local cleanup and forward
  the error message from identity broker to service manager.
- [Deprovisioning](https://github.com/openservicebrokerapi/servicebroker/blob/v2.16/spec.md#provisioning):
  On deprovisioning request the custom broker should first forward the request to the identity broker.
  If identity broker accepts the request, the custom broker can return `accepted` to service manager and start with deleting its instance. 
  In case it failed, the custom broker should forward the error message to service manager, but it must not delete its instance to avoid inconsistencies between 
  custom broker and identity broker.
  If the custom broker receives a deprovisioning request for an instance it does not know anymore, it must forward the request to identity broker anyway to clean up
  orphaned instances inside identity.
- [Last Operation](https://github.com/openservicebrokerapi/servicebroker/blob/v2.16/spec.md#polling-last-operation-for-service-instances):
  For last operation requests the custom broker must merge the results from its own provisioning/deprovisioning process and the result from identity broker.
  If a provisioning request failed, the platform will trigger a cleanup as defined [here](https://github.com/openservicebrokerapi/servicebroker/blob/v2.16/spec.md#orphan-mitigation).

### Registration

#### Register directly in Identity
See [service manager documentation](https://wiki.wdf.sap.corp/wiki/display/CPC15N/Test) to setup `smctl`. The registration is done using mTLS as described here https://wiki.one.int.sap/wiki/display/CPC15N/Develop#Develop-2.mTLSAuthentication. Basic auth is not supported.

##### Own Certificate
Register your broker at the service manager with the certificate used for the binding and the `osb_url`.
The certificate and key can be copied without any changes from the binding.


    Example request to register a subaccount scoped broker:
    ```
        smctl curl -X POST /v1/service_brokers -d '{
        "name": "reuse-broker",
        "broker_url": "https://eu-osb.accounts400.ondemand.com/sap/cp-kernel/identity/v1/osb/209a0132-a0b7-4a9b-b170-0b4de8bef598",
        "credentials":{
                "tls":{
                        "client_certificate": "-----BEGIN CERTIFICATE-----\nMIID9zCCAt+gAwIBAgIOAO9tJMogX3WhAAAC...2y6hKvrry6jYJVjHgZFGzxwXxkilj0waQmWt6PMfugg=\n-----END CERTIFICATE-----",
                        "client_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAttt/Ipjc6tn35FDyEUNW3B...eBMXHCl56mf3NhkqBYs6AQ==\n-----END RSA PRIVATE KEY-----"
                }
        }
    }'
    ```
##### Service Manager provided Certificate
Follow these steps to use the *service manager provided mTLS feature* with a broker registered directly in identity:
1. Look up the `service_manager_certificate_subject` via the service manager info endpoint https://service-manager.cfapps.{landscape-domain}/v1/info
2. Generate a self-signed certificate with the subject obtained in step 1:
```
openssl req -newkey rsa:4096 \
            -x509 \
            -sha256 \
            -days 3650 \
            -nodes \
            -out example.crt \
            -keyout example.key \
            -subj "/C=DE/O=SAP SE/OU=SAP Cloud Platform Clients/OU=Canary/OU=sap-service-manager-cf-eu10-canary/L=service-manager/CN=service-manager"
```
3. Configure the generated certificate in your IAS provider instance by creating a binding with `"credential-type": "X509_PROVIDED"` and `"certificate"` should be set to the certificate generated in step 2.
4. Enable the *service manager provided mTLS feature* in your broker registration in service manager.
```
smctl curl -X POST /v1/service_brokers -d '{"broker_url":"https://<broker-url>","credentials":{"tls":{"sm_provided_tls_credentials": true}}, "description":"<my broker description>","name":"<my-broker-name>"}'
```


#### Register custom Broker
If a custom broker was created register your service with the url and credentials of your broker in service manager.

#### Test
Consumers are now able to create instance of your exposed service:
Example:

`cf create-service reuse-service reuse-plan reuse-service-instance`

Hint: For reuse instances only the `display-name` parameter is supported.

### Callbacks for Services
See  [TG 02.R5](https://sap.sharepoint.com/:w:/r/teams/CPASecurity/_layouts/15/Doc.aspx?sourcedoc=%7BCF42DAA3-DC82-4021-B017-E4EAB0709F57%7D&file=IAM_ADR_SERVICE_TO_CONSUMER_COMMUNICATION.docx&action=default&mobileredirect=true) for details on how to enable callbacks from your service into an application that consumes it (*consumer application*). It is not required anymore that the service is subscribed into the consumer tenant, instead it will work out of the box.

### Proof Token
When forwarding the OIDC token, proof of possession must be ensured. Further details can be found [here](https://github.wdf.sap.corp/CPSecurity/Knowledge-Base/blob/master/03_ApplicationSecurity/ProofOfPossession.md).

### Service UI

Your service may have an UI for managing the service instance. To enable this scenario your service must be subscribed into the consumer tenant, which is not done by default.

#### Single tenant UIs / App2App
If your service has an UI that shall only be available in the zone where the instance was created, so that developers can access the UI, Service Manager offers
the [auto_subscription feature](https://int.controlcenter.ondemand.com/index.html#/knowledge_center/articles/8f9b9b8d5e3d4e4f92685605ff098e49). This feature must also 
be used incase your service supports the app2app flow.
After updating the catalog you also need to update your registration in service manager. Furthermore, this feature requires a subscription manager instance configure for reuse serivce ("applicationType" : "service"). See [subscription manager documentation](https://int.controlcenter.ondemand.com/index.html#/knowledge_center/articles/7961284168e848efb9e0462e38b4075d).

Example:
```json
{
    "id": "c1745457-88f4-476a-b06c-f8865b63719b",
    "name": "reuse-plan",
    "bindable": false,
    "metadata": {
        "auto_subscription":{
            "type":"subscription-manager"
        }
    }
}
```

#### Multi tenant UIs
If your service has an UI that shall not only be available in the zone where the instance was created, but also where the instance is subscribed, so that business users can access it, set the parameters below.

```json
{
    "id": "c1745457-88f4-476a-b06c-f8865b63719b",
    "name": "reuse-plan",
    "bindable": false,
    "metadata": {
        "auto_subscription":{
            "type":"subscription-manager"
        },
        "subscribe_with_consuming_app": true

    }
}
```

Complementary to the `auto_subscription` feature, Identity Broker offers the `subscribe_with_consuming_app` feature.
While `auto_subscription` enables services to be subscribed in case a service instance of their service is created (so that Developers can access the UI), `subscribe_with_consuming_app` enables them to be subscribed if one of their **direct consumers** is subscribed.
This enables business users (SaaS tenant) to consume the UI of reuse services using in the context of the subscribed application tenant (formerly: zone).

**Important**: If `subscribe_with_consuming_app` is enabled your instance will not be able to be subscribed via cockpit. This feature is intented to be used by pure reuse services only.

### Reuse Instance Binding
If you want to allow bindings for reuse instances, the plans in the catalog of your reuse service have to be configured accordingly.

A **complete catalog** must be provided to use this feature (so **IDs of service/plans must be configured**), see [configuration of catalog](#reuse-services) for details.
Furthermore, the following properties are required for bindable plans:
- `metadata.bindingData.url: "some-url"`
- `bindable: true`

Also, the service needs to declare that it supports fetching binding data by setting this property `"bindings_retrievable": true` on **service** level. See [OSB API](https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#fetching-a-service-binding) for details.

Example configuration of a bindable plan:
```json
{
    "id": "c1745457-88f4-476a-b06c-f8865b63719b",
    "name": "reuse-plan",
    "bindable": true,
    "metadata": {
        "bindingData": {
            "url": "https://test.service.sap.com",
            "custom-property-1": "custom-value-1",
            "custom-property-2": ["list-value-1", "list-value-2"],
            "custom-property-3": {
                "nested-property": "nested-value"
            }
        }
    }
}
```

All data within `bindingData` will be provided in the binding result inside the `credentials` object. The broker will not add any clientsecret/certificates to the binding result.

If the catalog for your reuse service was configured correctly, reuse intances using bindable plans are now allowed to create bindings.

Examples:
```
cf create-service-key reuse-service-instance // create a service key
```
or
```
cf bind-service my-test-app reuse-service-instance // bind instance to an application
```    

### Certificate Revocation

All broker endpoints implement an automated certificate revocation mechanism. If a broker endpoint is called with a certificate with a newer issue timestamp, it will reject all older certificates of the same subject dn.
There is a grace period of 10 minutes in which both certificates (new and old one) are accepted.

Therefore, if you rotate your certificate, make sure that all components that call broker endpoints are either rotated at the same time or using different certificate subject dns.


## Attribute Mappings for Multi-Tenant Applications

Multi-Tenant applications should provide the attribute mappings for users that exist in the identity directory (`assertion-attributes`).
However, they should not provide attribute mappings for corporate IdPs as these depend on the configuration of the corporate IdP and are customer specific.

If a customer uses the application in proxy mode and forwards the authentication to the corporate IdP, the customer should create the attribute mappings himself.
To support the customer, the UI shows the list of attributes supported by the application (derived from the mappings for the identity directory).
See the screenshot below for an example.
![attributes](images/attributes.png)

Furthermore, the customer is able to add additional attributes (so called *Self-defined Attributes*). This is for additional user attributes which the application itself does not use, but which are required for a reuse service to which the token is forwarded.
Typical example: A customer configures a destination by which the application communicates with another system. The target system uses a different attribute as user ID than the application being configured in IAS, so the destination service cannot extract this user ID from the attributes provided to the application by default. The customer configures the respective user attribute as custom attribute in the application reference, and configures the destination to use the same attribute name as user ID for the target system.




## FAQ
- `Error: Could not find xsuaa application: XSUAA_*`: Reason is that `xsuaa-cross-consumption` is set to true, but the XSUAA application does not exist in the IAS tenant. See https://jam4.sapjam.com/blogs/show/EyHCddES51KMWfAByriAOv on how to create trust between IAS and XSUAA
- `The application cannot be set as multi-tenant.`: Reason is that `multi-tenant` is set to true, but the IAS tenant is not enabled as multi-tenant. See [Preconditions](#Preconditions) for information how to enable an IAS tenant as multi-tenant.
- `Service instance cannot be deleted while reuse instances exist`: Reason is that your identity instance is a service and there are still instances of it existing (so called reuse instances). These must be cleaned up before your identity instance can be deleted.
To delete them either:
	- Ask the creators of the instances of your service to delete them (via e.g. cockpit)
	- If it is not possible to delete using the regular flows, you can also bypass service manager / cloud controller and delete them in identity only. **This will leave orphaned data in service manager / cloud controller. The instances will still be shown in cockpit but are broken. It then also requires manual cleanup from their side. Do only use this incase the instance have been already purged from service manager.** \
Use the certificate and osb_url from the binding of your identity instance and execute: `DELETE \<osb_url\>/v2/service_instances/<reuse_instance_id>?service_id=<your_service_id>&plan_id=<your_plan_id>&accepts_incomplete=true`. \
To get a list of all service instance of your service, you can use `GET \<osb_url\>/v2/service_instances`. The returned instances are paged if there are more than 100 instances. To receive the next page use `GET \<osb_url\>/v2/service_instances?start_id=<start_id>` where `start_id` can be extracted from the previous response.\
If no binding exists anymore and it is not possible to create a new binding because the instance is in a broken state, do the following: Access the admin console of your provider IAS tenant (where the instance was created) and add a certificate to the provider application (you can search for the application which has the same name as the instance id). Then this certificate can be used to call the APIs for cleanup.

## Questions
If you have questions or problems, please create a post in Stack: https://sap.stackenterprise.co/search?tab=newest&q=%5bias%5d

## Official Documentation
- [Identity Broker Documentation](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/integrating-service-with-identity-service-of-sap-btp)

----

# Develop a Multitenant IAS-based Reuse Service

Please note that this chapter builds on knowledge explained in the previous chapters.  

## Develop the Reuse Service 

Similar to applications, IAS also supports authentication for services; as a result, the service must therefore hold an instance of IAS. 

The service developer must implement two kinds of APIs:  
1. The API exposed by the service itself and consumed by the consumers 
2. Open Service Broker API - see [OpenServiceBrokerAPI](https://www.openservicebrokerapi.org)

They may be implemented in only one application, but usually, it could make sense to develop them in separate applications, as they usually have different lifecycle and scaling needs.  

When accessing the service's API, two entities are relevant for authentication & authorization:
1. The user is represented by an OIDC token, coming from a customer IAS tenant
2. The application making calls is represented by a certificate.
So the target picture is: log in the user in the application and send the same token to all services. No token exchange is needed anymore.  
When calling a remote service, the application additionally needs to send its X.509 certificate as part of mutual TLS. Only with the combination of X.509 and OIDC, the service can authenticate the call.  

For the services built around SAP BTP and XSUAA, the [Service Broker Framework](https://github.wdf.sap.corp/xs2/node-sbf) offers great support in developing a Service Broker. It is strongly recommended to consider it also for IAS-based services. 

![Develop Service](../images/dev_srv_dev.png)

## Register Reuse Service with Service Discovery and Management & Unified Service Manager 

A reuse service [should register](https://controlcenter.ondemand.com/index.html#/knowledge_center/articles/7961284168e848efb9e0462e38b4075d) with Unified Service Manager for the same reasons as the applications, as mentioned in the respective chapter before. 

Additionally, it must also register with Service Discovery and Management in order to: 
1. Make the service visible in the marketplace / the catalog with all the available services 
2. Allow the consuming environment (anything you have: BTP CF, K8S Cluster, Kyma, own DC, Raspberry PI ;) ) to perform Open Service Broker API operations with the Service Broker associated with the service. In order to access a service broker, the environment communicates with SDM who then communicates with the broker. Thus, SDM must be able to authenticate with the service broker. That is, SDM must know the credentials for accessing the Service Broker, and this registration step is exactly the place where the service owner informs SDM about the broker’s credentials. See [Test](https://wiki.one.int.sap/wiki/display/CPC15N/Test) and [Register](https://wiki.one.int.sap/wiki/display/CPC15N/Register) respective documentation.

![Register Service](../images/dev_srv_register.png)

## Implementation Details for Reuse Services

According to [OpenServiceBrokerAPI](https://www.openservicebrokerapi.org), it's clear that a service must prepare itself for a new consumer during the `provision` step. This means: Implement a broker and do the needed activities in the `provision` method.  
On the other hand, because a Reuse Service is by definition also multi-tenant, it must also prepare itself for a new consumer when the customer subscribes to the application consuming the service. That is, implement the callbacks as documented in: [Onboard your BTP Multitenant Application/Service to Unified Service Manager (Supporting IAS)](https://controlcenter.ondemand.com/index.html#/knowledge_center/articles/7961284168e848efb9e0462e38b4075d).  
That looks like: Implement the same functionality twice.  
Luckily, a shortcut is possible. You may identify your service as being [auto-subscribable](https://controlcenter.ondemand.com/index.html#/knowledge_center/articles/8f9b9b8d5e3d4e4f92685605ff098e49). This means that every time a new instance is created, Service Discovery and Management takes care to inform also Subscription Management Service asking to subscribe to the newly-created instance.  
This auto-subscription has thus 2 effects:
- The service's subscription gets called, allowing the service to get prepared for the new consumer, without implementing this in the `provision` method.  
- Also, the dependent services consumed by the service get aware (via their callbacks) of the new consumer and may get ready to serve it.  

Taking into account this "shortcut" + the capability of IAS-Broker to [act itself as broker](../20-identity-broker.md#reuse-services) also for other Services, we understand that in reality, we only need to implement our own broker in very specific cases, if certain activities must indeed happen in any of the OSB methods. The most common example here is if the service accepts parameters which then should be stored by the broker.  

## Caller Validation during Runtime 

When an API of a service is being called, the Security Libs perform the token validation together with provider's IAS Tenant. For details on token validation you may check [Token Validation](../../030-Authentication/90-Token_Validation.md). As an example, for the nodeJS Security Lib, [here](https://github.wdf.sap.corp/CPSecurity/node-xs2sec#identity-service) there are further details.   
For certain special needs - like identifying the serviceInstanceID for the service instance involved in a certain communication - you should implement the flow documented in [Proof of Possession](https://github.wdf.sap.corp/pages/CPSecurity/Knowledge-Base/03_ApplicationSecurity/ProofOfPossession/#1-check-client-specific-x509-certificates) document.   

## Consumption of Reuse Services from within Applications

Please check the [respective chapter](./10_first_steps.md#authentication-for-consuming-reuse-services) already documented.

## Bi-directional Trust for Reuse Services

The typical consumption of services which are exposed in Service Manager is uni-directional. Meaning that consumers that obtain a service instance are able to call the service and get a response. In this uni-directional mode, the service is unable to initiate a call to the consumer. Some services additionally require being able to initiate calls to the consumer.

This type of reuse service is an extension of the multi-tenant reuse service described in the respective chapter above using a technology similar to [App2App](./10_first_steps.md#authentication-for-app2app-calls), using as resource parameter the value `urn:sap:identity:consumer:clientid:<consumer client id>`.

## Cross-consumption of xsuaa-based Services

In the first phase of adopting IAS for authenticating applications and services, we expect that they will co-exist with xsuaa-based services, built on SAP BTP. For example, an IAS-based application may use SAP Destination and Connectivity Service for connecting via the Cloud Connector to an on-prem S/4 System. 

The developer needs a subaccount (which is by default associated with an xsuaa tenant) trusting their provider IAS Tenant. 
The developer creates an instance of the xsuaa-based reuse service in this subaccount. As a result of the binding operation, xsuaa-based credentials are being generated. 

As explained in the previous chapters, every multitenant IAS-based application will be executed in the context of an OIDC token belonging to the user who’s currently using the application. 

For the application to consume the xsuaa-based reuse service it must exchange the OIDC token for an xsuaa (JWT) token using the credentials obtained when binding the service instance (see [JWT Bearer Token Grant](https://docs.cloudfoundry.org/api/uaa/version/74.26.0/index.html#jwt-bearer-token-grant)).  In order for this exchange to work, the application must set the flag `xsuaa-cross-consumption` as [documented](../20-identity-broker.md#service-instance-parameters).  
Then, the application can easily call the service endpoint by passing the JWT in the request as value for the “Authorization” header. The reuse service will not even know that the caller is “outside” the xsuaa environment, while the application will keep relying on the IAS-produced OIDC token, which might be also used to directly call other IAS-based services.

----
## DC-Setup

## Introduction
Identity Kernel Service provides applications with functionalities for authentication, authorization and user 
provisioning. Focus of this document is integration based on OAuth, such as the Open ID Connect (OIDC) protocol for 
named user authentication or client credential tokens for technical communication.

This guide gives architects recommendations on how to integrate multi-tenant IAS applications.

## Multi Tenant applications 

![setup](integration/images/setup.png)

### IAS provider IAS tenants
Multi-tenant applications have a provider IAS tenant in the Rot/Amsterdam data center. When they are flagged as
multi-tenant, their definition is replicated into all other data centers and through tools like SPC, BTP Subscription
Management Service or Unified Service Manager subscriptions can be created.

Each application needs to have a provider IAS tenant. 

### Data center setup
Typically, applications are provided in different data centers. This gives applications two options:
#### Sharing the master application
Applications may decide to share the same master application between different DCs. 

**Pro**
- This makes sense for global applications.
- Customer sees a single application for accessing different DCs. This is e.g. used by BTP cockpit.

**Contra**
- DCs should have a common update slot as otherwise dependencies between the app before the 
update and after the update may interfere. This is usually the setup that is difficult to test.

![setup](integration/images/dc-setup-single-master.png)
#### One master per application data center
Applications may decide to use one master application per deployment but use the same IAS provider tenant.

**Pro**
- Simple model with clear dependencies.
- Updates can be handled on a DC-per-DC basis.

**Contra**
- In case a customer uses an app in multiple DCs, the customer gets multiple subscriptions.

![setup](integration/images/dc-setup-multi-master.png)

## Registering IAS applications
There are 3 ways to create master application(s) in the IAS tenant:
1. Using Identity Broker

In BTP environment, you could create IAS application by creating a service instance from an [Identity Broker](https://github.wdf.sap.corp/CPSecurity/Knowledge-Base/blob/master/06_Architecture/Identity_Service/IAS-Broker.MD). The tutorial for Identity Broker can be found here: https://github.wdf.sap.corp/CPSecurity/Knowledge-Base/tree/master/08_Tutorials/iasbroker

2. Using IAS API: https://api.sap.com/api/SCI_Application_Directory/path/createApplication

To access the API, you need to create a system admin user in the IAS Admin UI: `User & Authorizations` -> `Administrators` -> `Add` -> `System`.

![create-systemadmin-user.png](integration/images/create-systemadmin-user.png)

After creating the system admin user, create a certificate to be used to access the IAS API to create IAS applications

![systemadmin-user-certificate.png](integration/images/systemadmin-user-certificate.png)

3. Manual Creation using IAS Admin UI

To create an IAS application, you could choose the followings in the Admin UI: `Applications & Resources` -> `Applications` -> `Create`

![create-ias-application.png](integration/images/create-ias-application.png)

## Managing certificates
Multi tenant applications require certificates for obtaining tokens.
SAP SCI ensure SAP Cloud Root CA and Digicert CAs are accepted in all customers IAS tenants.
Customer may request additional CAs for their IAS tenants, but this will  be a customer specific configuration.

Recommendation is to use certificates obtained by SAP Cloud Root CA.

### For test purposes
For testing, you can go to the IAS admin console and have a certificate generated for you:
For this go to Application APIs>Client Authentication
![img.png](integration/images/ias-certificates.png)

In the Certificate section, choose Add and Generate certificate. Once the cert has been generated, press the "Add"
button to map the certificate.

This will generate a certificate and download cert & private key using a PKCS#12 (.p12) file.
Once you have it, use it with mTLS. This is an example using curl:

```shell
curl --cert-type P12 --cert <path to cert.p12 file>:<p12 password> <ias tenant>/oauth2/token  -d "grant_type=client_credentials&client_id=<client id>"
```

### For production

For production, you need to automate certificate generation. This can either happen using BTP certificate service or you
integrate with Identity Broker. Both will require a BTP account for the provider but will not require BTP accounts for customers.

As alternative, you can integrate with IAS to proxy requests to BTP certificate service and
use the API of IAS https://wiki.one.int.sap/wiki/display/idservice/Certificate+Service+API
This will proxy your requests to BTP certificate service.

## Configure Subscriptions

You can use either SPC or USM to configure the subscription for the IAS applications.
The parameter `app_tid` could be configured in this step.
As of now, to manage subscriptions in the QA landscape, please contact [Martijn de Boer](https://github.wdf.sap.corp/D039113) and [Patrick Firnkes](https://github.wdf.sap.corp/D063627)

## Handling SCI Tenant Changes
It is essential to understand that the SCI tenant to which an application is trusted to may change over time.
Thus, applications must implement appropriate mechanisms through SMS notifications to handle such changes to ensure smooth operation and compliance with system requirements.

Broadly, two cases emerge based on whether the application dynamically resolves tenant information or persists it locally:
1. **Dynamic IAS tenant Resolution:**
   The application dynamically determines the tenant during runtime without persisting the tenant information. This approach relies on the tenant login info endpoint provided by BTP tenant management.
   In this case the application doesn't need to handle SMS notifications regarding tenant change.
    <details>
    <summary>Request tenant information</summary>
   
   ```
   GET ${btpTenantApi}/sap/rest/tenantLoginInfo?id=${appTid}
   ```
   ```
   GET ${btpTenantApi}/sap/rest/tenantLoginInfo?subdomain=${subdomain}
   ```
    </details>
2. **Stored IAS tenant:**
   The application persists the tenant information, directly in its own persistency or externally e.g. in a destination. This is often due to specific trust configurations per application tenant. This approach requires active handling of tenant change notifications from the Subscription Management Service (SMS) to update local configurations and maintain functionality. In this case the application needs to handle the SMS notification accordingly through [SMS APIs](https://int.api.hana.ondemand.com/api/APISubscriptionManagerService/path/getSubscriptions). This is essential to ensure seamless integration and avoid disruptions in authentication processes.

N.B. Changing IAS trust is not yet end-to-end available. 


----
# Concept

IAS supports multi tenancy. IAS applications declared as multi tenant can be replicated by a subscription process to a customer IAS tenant.

![ias-multi-tenant.png](images%2Fias-multi-tenant.png)


In a customers IAS tenant it will appear as _managed application_ with restricted customizing options, e.g. the customer can configure settings such as:
- corporate IdP
- attributes
- subject name
- redirect URIs for supporting custom domains
- API Dependencies for App2App configuration

Other settings like credentials are inherited and can only be changed by the application provider.

Subscribed application have the following configurations:
- **Client id:** All subscriptions share the same tenant identifier
- **Application tenant id:** Upon subscription, an application defines an application specific tenant identifier. IAS will include claim `app_tid` with the value. IAS makes no guarantee on uniqueness, it is in the applications responsibility to ensure uniqueness.
- **Credentials:** Credentials are inherited to all subscriptions. Recommendation is to use mTLS, secrets are not supported.
- **Redirect URIs:** Redirect URIs are replicated. Applications may use a wildcard when addressing tenants by hostname, e.g. `https://*.myapp.com/login`
- **API Permission Groups:** All permission groups are inherited. IAS does not support provider-only permission groups.
- **Authorizations:** When using AMS for authorizations, these are inherited with a subscription (currently restricted to BTP based subscriptions)
- **Attributes:** Attribute definitions are inherited and can be adopted. Customers may define additional attributes.
- **Subject Name identifier:** The subject Name identifier is inherited, but customers may change it. Application relying on a specific SNI, should define a customer attribute (e.g. Global User Identifier).


#### Integrations
SCI supports integration for multi tenancy with BTP (using SMS), SPC and Unified Service Manager.

#### BTP
Please check the samples below and the [documentation](https://controlcenter.ondemand.com/index.html#/knowledge_center/articles/7961284168e848efb9e0462e38b4075d).

| Feature                                                                                         | Technology        | Info                                                              |
|-------------------------------------------------------------------------------------------------|-------------------|-------------------------------------------------------------------|
| [Approuter][MTSCISS]                                                                            | Approuter+Backend | Using BTP SMS for multi-tenancy                                   |
| [Web application migrated from xsuaa][MTSCIMS] | Approuter+Backend | Tenant-by-tenant migration of an existing xsuaa-based application |

[MTSCISS]: https://github.wdf.sap.corp/CPSecurity/sci-samples/blob/master/samples/multi-tenant/sci-spring-simple/README.MD
[MTSCIMS]: https://github.wdf.sap.corp/CPSecurity/sci-samples/blob/master/samples/multi-tenant/sci-migration-using-sms/README.MD

#### SPC
Please reach out to [Martijn de Boer](https://github.wdf.sap.corp/D039113)

#### USM
See [Unified Service documentation](https://pages.github.tools.sap/atom-cfs/atom-docs/docs/business-use-cases/security/)


## Under the hood

![setup.png](images%2Fsetup.png)

For multi tenant applications, IAS introduced a new flag "multi-tenant" in https://tenants.ias.only.sap when requesting a tenant. 
When an IAS tenant is multi tenant, OIDC application support the flage "multi tenant" to indicate that the application is multi tenant.

On a technical side, the following is happening:
- All IAS provider tenants with the multi-tenant flag are in the ROT DC. When an application is flagged as multi tenant, a job runs to replicate the definition of that application as a copy to the persistence of all other DCs. This happens every 24 hours.
- If a subscription is created, in the consumer IAS tenant, IAS will create an "AppRef". This a managed application which merges data from a local copy of the provider application with customizing settings in the  application in the consumer tenant. Customers will e.g. be able to set their corporate IdP on the AppRef, but settings like  client authentication are inherited from the master.

- In case the Rot DC goes down (and does not fail over to Frankfurt), it means updates are not possible but as there is no runtime call, it continues to work on the consumer IAS tenant.

## Q & A

### Who owns the provider IAS tenant?
The provider IAS tenant is owned by the application provider team. It is in the teams responsibility to manage access and security configuration.

On BTP, the provider subaccount establishes trust with the provider IAS tenant. By default, there will be two IdP for authentication: SAP ID Service (can be disabled) and the provider IAS tenant. If authentication is using SAP ID Service and interaction with the provider IAS tenant is only using identity broker, the credentials for accessing the provider tenant can be locked away.

### Why is the provider tenant only in the Rot DC?

This was a design decision for simplicity. As it is only used for defining the application and not used at runtime, offering the service in Rot is assumed to be sufficient.

### When testing, long delays for replication are unacceptable. How can we speed up the process?

Replication is needed when the consumer tenant is in another DC. For testing, please set up an IAS tenant in the Rot DC as no replication is needed in that case. You get the IAS tenant DC from `<ias>/admin/#/tenantSettings/info`.
It should read `Germany/Netherlands` to avoid replication delays.

### Why can't we use secrets for authentication?
With a green/blue deployment, secrets are not a good fit. When a new version is deployed, the secret would need to replicated to all tenants. This only happens every 24h. mTLS is a better fit as it is based on certificates which have a stable SubjectDN.

### I already have a tenant. Can I enable multi tenancy?
If you already have a tenant and want to keep it, it can be changed to support multi tenancy. Prerequisite is that the tenant is in the Rot DC. You can [open a ticket](https://wiki.one.int.sap/wiki/display/idservice/Support) to move the tenant (if needed) and enable multi tenancy.