# IAS based Reuse Service

IAS broker could generally be consumed directly without SBF. But SBF is used in this sample as preparation for the (XSUAA-IAS) hybrid mode.

see [reuse-service-ias](/.cursor/ias/reuse-service-ias)

![ias-ias-based-reuseservice.png](ias-based-reuseservice.png)

# General Info

Generally, if you need to modify the mta.yaml, you have to rebuild the mtar file by running `mbt build`. Otherwise, you could simply use the provided mtar file.

```shell
mbt build               # Optional
```

# Setup the Reuse Service (Provider Subaccount)

```shell
cf deploy mta_archives/sci-reuse-ias_1.0.0.mtar
```

This will:

1. Create an IAS broker instance
2. Deploy the reuse service, which represents the broker implementation and relies on IAS broker for authentication and authorization.
3. Deploy the SBF based broker application, which delegates to IAS broker.
4. Register the reuse service in the subscription manager with `auto_subscription`, for subscription of the consuming application

## Register the service broker to be reusable in the consumer subaccount

Before registering the service broker to make it reusable in the consumer subaccount, you need to login to the service manager by providing the subdomain of the consumer and using your email address. For the password, you need to concatenate your SAP Global Password with 2-factor auth code from accounts.sap.com.
For more details about the service broker registration, and about installing and using smctl, please refer to the [service manager documentation](https://wiki.one.int.sap/wiki/display/CPC15N/Service+Provider) and its subsections, e.g. [Test - Register Broker](https://wiki.one.int.sap/wiki/display/CPC15N/Test#Test-5.RegisteryourBrokerasSubaccount-Scoped).

Note:

- the broker username and password are `broker-username` and `broker-password` as provided in is [mta.yaml](./mta.yaml#L64)
- if you are testing the application in other landscape than EU12, then you might need to change the value of `SBF_SERVICE_MANAGER_CERTIFICATE_SUBJECT` in [mta.yaml](./mta.yaml#L29) as described in [node-sbf](https://github.wdf.sap.corp/xs2/node-sbf#out-of-the-box-mtls).

```shell
smctl login -a https://service-manager.cfapps.eu12.hana.ondemand.com  --param subdomain=<consumer-subdomain> -u <email>@sap.com
smctl curl -X POST /v1/service_brokers -d '{"broker_url":"https://<service-broker-uri-in-provider-subaccount>.cert.cfapps.eu12.hana.ondemand.com","credentials":{"tls":{"sm_provided_tls_credentials": true}, "basic":{"username":"broker-username", "password":"broker-password"}}, "description":"IAS based reuse service", "name":"consumer-reuse-service-ias"}'
```

## Setup the consumer application consuming the reuse service instance

Before you execute the deployment, you might want to switch the CF target to the consumer subaccount.

```shell
cf deploy reuse_consumer/mta_archives/sci-reuse-ias-consumer_1.0.0.mtar
```

This will:

1. Create an instance of the reuse service
2. Create an IAS application instance, with declares `consumed-services` of the reuse service instance
3. Deploy an approuter application, which relies on the IAS application instance for the user login
4. Deploy a backend application, which will be referred by the approuter application and will consume the reuse service. As the IAS application instance is declaring `consumed-services` to the reuse service instance, the token from this application will be consumable by the reuse service (see [mta.yaml](Workspaces/IdeaProjects/sci-samples/samples/single-tenant/reuse-service-ias/consumer/mta.yaml#L89)).
5. Register the application in the subscription manager.

## Try the consumer application in a new subacccount

### Subscribe to the application

Subscribe to the application and map the route to the url of subscription in the consumer application subaccount.
On subscribing, the subaccount will be subscribed both in the consumer IAS and in the reuse service IAS via SMS.

```shell
 cf map-route sci-reuse-ias-approuter  cfapps.eu12.hana.ondemand.com -n <subscriber-subdomain>-<consumerOrg>-<consumerSpace>-sci-reuse-ias-consumer-approuter
```

### Call the application

To call the application, you need to find out the route URL of the consumer application, and access the path `/products`.

`https://<subscription-url>/products`

if the request was executed successfully, you would get the following response returned by the service provider:

```json

{
    "name": "Beer for <family_name>, <given_name> from <application_uris>",
    "claims": <token_claims>
}
```

And you could check the log of the **reuse service** in the provider subaccount. You will then see some details of the token claims passed to the reuse service, such as the followings. Check the implementation in [ProviderController.java](./service/src/main/java/sample/spring/security/ProviderController.java#L45)

```
2023-10-17T09:32:21.54+0200 [APP/PROC/WEB/0] OUT Token Claims: {sub=553dc5c2-bfa7-48c6-9288-3294a9abf698, app_tid=4b0e189b-e9b1-4eca-ae69-8e13d6d17c7c, iss=https://axzlnkemn.accounts400.ondemand.com, given_name=Heru, sid=S-SP-e349cd28-970a-4f8d-83a6-5ad80855ab1f, ias_iss=https://axzlnkemn.accounts400.ondemand.com, aud=[49df4fc0-ccf8-42c2-93a7-f16a731dbe24, 4c3007b9-96b5-483a-93f3-c1c23da7e12a, f4167b4c-c2a2-4139-9360-831b2dea0af9], scim_id=553dc5c2-bfa7-48c6-9288-3294a9abf698, user_uuid=553dc5c2-bfa7-48c6-9288-3294a9abf698, azp=49df4fc0-ccf8-42c2-93a7-f16a731dbe24, zone_uuid=4b0e189b-e9b1-4eca-ae69-8e13d6d17c7c, exp=1697531246, iat=1697527646, family_name=Salim-Martinus, jti=222f3907-6e8e-45e8-a1f1-0faabdaa0141, email=heru.martinus.salim@sap.com}
```

### What happens?

1. When you first access the consumer approuter application, you will then be routed to the IAS instance of the consumer approuter application and be asked to login
2. After you login, you got the token of the consumer IAS application instance containing the `aud` of the reuse service client ID.
3. Accessing the path `/products`, your consumer token will be used to access the reuse service `/products`. See [getProducts()](Workspaces/IdeaProjects/sci-samples/samples/single-tenant/reuse-service-ias/consumer/consumer/src/main/java/sample/spring/security/ConsumerController.java#L59) in Consumer.java

## Try consuming the service provider manually

This section shows you what happens in the [previous section](#try-the-consumer-application) behind the scene.

`https://<consumer-approuter-url>/token` will return the used approuter token.
`https://<consumer-approuter-url>/tokenClaims` will return the used approuter token in the decoded form for you to see the token claims.

Consume the service provider directly using the token you get from the `/token` endpoint.

```shell
curl https://<provider-service-url>/products -H 'Authorization: Bearer <token-value>'
```

The returned response will be identical to the response from the [previous section](#try-the-consumer-application).

This could work, because the token claims from the consumer IAS contains the `aud` of the provider service due to `consumed-services` configuration in the consumer IAS instance.

## Cleanup

```shell
# in consumer subaccount
cf undeploy sci-reuse-ias-consumer --delete-services

# Get the reuse service to be deleted
smctl list-brokers | grep sci-reuse
smctl delete-broker <broker-name>

# in provider subaccount
cf undeploy sci-reuse-ias --delete-services
```
