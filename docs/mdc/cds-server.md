---
status: released
---



# Bootstrapping Servers





CAP Node.js servers are bootstrapped through a [built-in `server.js` module](#built-in-server-js), which can be accessed through [`cds.server`](#cds-server). You can plug-in custom logic to the default bootstrapping choreography using a [custom `server.js`](#custom-server-js) in your project.



[[toc]]



## CLI Command `cds serve`

A Node.js CAP server process is usually started with the `cds serve` CLI command,
with `cds run` and `cds watch` as convenience variants.

**For deployment**, when the `@sap/cds-dk` package providing the `cds` CLI executable is not available, use the `cds-serve` binary provided by the `@sap/cds` package:

```json
{
  "scripts": {
    "start": "cds-serve"
  }
}
```







##  Built-in `server.js`

The built-in `server.js` constructs an [express.js app](cds-facade#cds-app), and bootstraps all CAP services using [`cds.connect`](cds-connect) and [`cds.serve`](cds-serve).
Its implementation essentially is as follows:

```js twoslash
const cds = require('@sap/cds')
module.exports = async function cds_server(options) {

  // prepare express app
  const o = { ...options, __proto__:defaults }
  const app = cds.app = o.app || require('express')()
  cds.emit ('bootstrap', app)

  // mount static resources and middlewares
  if (o.cors)      app.use (o.cors)                     //> if not in prod
  if (o.health)    app.get ('/health', o.health)
  if (o.static)    app.use (express.static (o.static))  //> defaults to ./app
  if (o.favicon)   app.use ('/favicon.ico', o.favicon)  //> if none in ./app
  if (o.index)     app.get ('/',o.index)                //> if none in ./app and not in prod

  // load and prepare models
  const csn = await cds.load('*') .then (cds.minify)
  cds.model = cds.compile.for.nodejs (csn)
  cds.emit ('loaded', cds.model)

  // connect to essential framework services
  if (cds.requires.db) cds.db = await cds.connect.to ('db') .then (_init)
  if (cds.requires.messaging)   await cds.connect.to ('messaging')

  // serve all services declared in models
  await cds.serve ('all') .in (app)
  await cds.emit ('served', cds.services)

  // start http server
  const port = o.port || process.env.PORT || 4004
  return app.server = app.listen (port)
}
```



### cds. server() {.method}

This is essentially a shortcut getter to `require('@sap/cds/server')`, that is, it loads and returns
the [built-in `server.js`](#built-in-server-js) implementation.
You'd mainly use this in [custom `server.js`](#custom-server-js) to delegate to the default implementation, [as shown below](#override-cds-server).



### cds. app {.property}

The express.js `app` constructed by the server implementation.



##   Custom `server.js`

The CLI command `cds serve` optionally bootstraps from project-local `./server.js` or  `./srv/server.js`.

### Plug-in to Lifecycle Events

In custom `server.js`, you can plugin to all parts of `@sap/cds`.  Most commonly you'd register own handlers to lifecycle events emitted to [the `cds` facade object](cds-facade) as below:

```js twoslash
// @noErrors
const cds = require('@sap/cds')
// react on bootstrapping events...
cds.on('bootstrap', ...)
cds.on('served', ...)
```

### Override `cds.server()`

Provide an own bootstrapping function if you want to access and process the command line options.
This also allows you to override certain options before delegating to the built-in `server.js`.
In the example below, we construct the express.js app ourselves and fix the models to be loaded.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
// react on bootstrapping events...
cds.on('bootstrap', ...)
cds.on('served', ...)
// handle and override options
module.exports = (o)=>{
  o.from = 'srv/precompiled-csn.json'
  o.app = require('express')()
  return cds.server(o) //> delegate to default server.js
}
```

::: tip `req` != `req`
The `req` object in your express middleware is not the same as `req` in your CDS event handlers.
:::



## Lifecycle Events

The following [lifecycle events](cds-facade#lifecycle-events) are emitted via the `cds` facade object during the server bootstrapping process.
You can register event handlers using `cds.on()` like so:


```js
const cds = require('@sap/cds')
cds.on('bootstrap', ...)
cds.on('served', ...)
cds.on('listening', ...)
```


> [!warning]
> As we're using Node's standard [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
> event handlers execute **synchronously** in the order they are registered, with `served` and `shutdown`
> events as the only exceptions.


### bootstrap {.event}

A one-time event, emitted immediately after the [express.js app](cds-facade#cds-app)
has been created and before any middleware or CDS services are added to it.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
const express = require('express')
cds.on('bootstrap', app => {
  // add your own middleware before any by cds are added
  // for example, serve static resources incl. index.html
  app.use(express.static(__dirname+'/srv/public'))
})
```


### loaded {.event}

Emitted whenever a CDS model got loaded using `cds.load()`

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('loaded', model => { /* ... */ })
```


### connect {.event}

Emitted for each service constructed through [`cds.connect`](cds-connect).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('connect', service => { /* ... */ })
```

### serving {.event}

Emitted for each service constructed by [`cds.serve`](cds-serve).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('serving', service => { /* ... */ })
```

### served {.event}

A one-time event, emitted when all services have been bootstrapped and added to the [express.js app](cds-facade#cds-app).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('served', async (services) => {
  // We can savely access service instances through the provided argument:
  const { CatalogService, db } = services
  // ...
})
```

This event supports _asynchronous_ event handlers.


### listening {.event}

A one-time event, emitted when the server has been started and is listening to incoming requests.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('listening', ({ server, url }) => { /* ... */ })
```


### shutdown {.event}

A one-time event, emitted when the server is closed and/or the process finishes.  Listeners can execute cleanup tasks.

This event supports _asynchronous_ event handlers.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('shutdown', async () => { /* ... */ })
```



## Configuration

The behavior of the built-in `server.js` can be customized through the options documented in the following sections.

### CORS Middleware

The built-in CORS middleware can be enabled explicitly with <Config>cds.server.cors: true</Config>.  By default, this is `false` if in production.

[Learn more about best practices regarding **Cross-Origin Resource Sharing (CORS)**.](../node.js/best-practices.md#cross-origin-resource-sharing-cors) {.learn-more}



### Toggle Generic Index Page

The default generic _index.html_ page is not served if `NODE_ENV` is set to `production`. Set <Config>cds.server.index: true</Config> to activate explicitly also in production-like test environments, for example for deployed PoCs. You must not do this in real production environments!

[See the **Generic *index.html*** page in action.](../get-started/in-a-nutshell.md#generic-index-html) {.learn-more}



### Maximum Request Body Size

There are two ways to restrict the maximum request body size of incoming requests, globally for all endpoints and for individual services. If the payload exceeds the configured value, the request is rejected with _413 - Payload too large_. The configured values are passed through to the underlying Express body parser middlewares. Therefore, the default limit is _100kb_, as this is the default of the Express built-in [body parsers](https://expressjs.com/en/api.html#express.json).

The maximum request body size can be limited globally, for all services and protocols, using the configuration `cds.server.body_parser.limit`, like so:

```jsonc
{
  "cds": {
    "server": {
      "body_parser": {
        "limit": "1mb" // also accepts b, kb, etc...
      }
    }
  }
}
```

To restrict the maximum request body size of requests received by an individual service, the service specific annotation `@cds.server.body_parser.limit` can be used, like so:

```cds
annotate AdminService with @cds.server.body_parser.limit: '1mb';
```

This is useful when the expected request body sizes might vary for services within the application. If both the global configuration and the service specific annotation are set, the service specific annotation takes precedence for the respective service.



## See Also...

The [`cds-plugin` package technique](cds-plugins) provides more options to customize server startup.

-----
---
status: released
---



# Serving Provided Services



[[toc]]



## cds. serve (...) {.method}



Use `cds.serve()` to construct service providers from the service definitions in corresponding CDS models.

Declaration:

```ts:no-line-numbers
async function cds.serve (
  service        : 'all' | string | cds.Service | typeof cds.Service,
  options        : { service = 'all', ... }
) .from ( model  : string | CSN )         // default: cds.model
  .to ( protocol : string | 'rest' | 'odata' | 'odata-v2' | 'odata-v4' | ... )
  .at ( path     : string )
  .in ( app      : express.Application )  // default: cds.app
.with ( impl     : string | function | cds.Service | typeof cds.Service )
```


##### Common Usages:

```js
const { CatalogService } = await cds.serve ('my-services')
```
```js
const app = require('express')()
cds.serve('all') .in (app)
```




##### Arguments:

* `name` specifies which service to construct a provider for; use `all` to construct providers for all definitions found in the models.

```js
cds.serve('CatalogService')  //> serve a single service
cds.serve('all')             //> serve all services found
```

You may alternatively specify a string starting with `'./'` or refer to a file name with a non-identifier character in it, like `'-'` below, as a convenient shortcut to serve all services from that model:
```js
cds.serve('./reviews-service')  //> is not an identifier through './'
cds.serve('reviews-service')    //> same as '-', hence both act as:
cds.serve('all').from('./reviews-service')
```

The method returns a fluent API object, which is also a _Promise_ resolving to either an object with `'all'` constructed service providers, or to the single one created in case you specified a single service:

```js
const { CatalogService, AdminService } = await cds.serve('all')
const ReviewsService = await cds.serve('ReviewsService')
```


##### Caching:

The constructed service providers are cached in [`cds.services`](cds-facade#cds-services), which (a) makes them accessible to [`cds.connect`](cds-connect), as well as (b) allows us to extend already constructed services through subsequent invocation of [`cds.serve`](cds-serve).


##### Common Usages and Defaults

Most commonly, you'd use `cds.serve` in a custom file to add all the services to your [express.js](https://expressjs.com) app as follows:

```js
const app = require('express')()
cds.serve('all').in(app)
app.listen()
```

This uses these defaults for all options:

| Option               | Description                     | Default                     |
|----------------------|---------------------------------|-----------------------------|
| cds.serve ...        | which services to construct     | `'all'` services            |
| <i>&#8627;</i> .from | models to load definitions from | `'./srv'` folder            |
| <i>&#8627;</i> .in   | express app to mount to         | — none —                    |
| <i>&#8627;</i> .to   | client protocol to serve to     | `'fiori'`                   |
| <i>&#8627;</i> .at   | endpoint path to serve at       | [`@path`](#path) or `.name` |
| <i>&#8627;</i> .with | implementation function         | `@impl` or `._source`.js    |

Alternatively you can construct services individually, also from other models, and also mount them yourself, as document in the subsequent sections on individual fluent API options.

If you just want to add some additional middleware, it's recommended to bootstrap from a [custom `server.js`](#cds-server).




### .from <i> (model) </i> {#from .method}

Allows to determine the CDS models to fetch service definitions from, which can be specified as one of:

- A filename of a single model, which gets loaded and parsed with [`cds.load`]
- A name of a folder containing several models, also loaded with [`cds.load`]
- The string `'all'` as a shortcut for all models in the `'./srv'` folder
- An already parsed model in [CSN](../cds/csn) format

The latter allows you to [`cds.load`] or dynamically construct models yourself and pass in the [CSN](../cds/csn) models, as in this example:

```js
const csn = await cds.load('my-services.cds')
cds.serve('all').from(csn)...
```

**If omitted**, `'./srv'` is used as default.



### .to <i> (protocol) </i> {#to .method}

Allows to specify the protocol through which to expose the service. Currently supported values are:

* `'rest'` plain HTTP rest protocol without any OData-specific extensions
* `'odata'` standard OData rest protocol without any Fiori-specific extensions
* `'fiori'` OData protocol with all Fiori-specific extensions like Draft enabled

**If omitted**, `'fiori'` is used as default.



### .at <i> (path) </i> {#at .method}

Allows to programmatically specify the mount point for the service.

**Note** that this is only possible when constructing single services:
```js
cds.serve('CatalogService').at('/cat')
cds.serve('all').at('/cat') //> error
```

**If omitted**, the mount point is determined from annotation [`@path`](#path), if present, or from the service's lowercase name, excluding trailing _Service_.

```cds
service MyService @(path:'/cat'){...}  //> served at: /cat
service CatalogService {...}           //> served at: /catalog
```


### .in <i> ([express app](https://expressjs.com/api.html#app)) </i> {#in .method}

Adds all service providers as routers to the given [express app](https://expressjs.com/api.html#app).

```js
const app = require('express')()
cds.serve('all').in(app)
app.listen()
```





### .with <i> (impl) </i> {#with .method}

Allows to specify a function that adds [event handlers] to the service provider, either as a function or as a string referring to a separate node module containing the function.

```js
cds.serve('./srv/cat-service.cds') .with ('./srv/cat-service.js')
```

```js
cds.serve('./srv/cat-service') .with (srv => {
  srv.on ('READ','Books', (req) => req.reply([...]))
})
```

[Learn more about using impl annotations.](core-services#implementing-services){.learn-more}
[Learn more about adding event handlers.](core-services#srv-on-before-after){.learn-more}


**Note** that this is only possible when constructing single services:
```js
cds.serve('CatalogService') .with (srv=>{...})
cds.serve('all') .with (srv=>{...})  //> error
```

**If omitted**, an implementation is resolved from annotation `@impl`, if present, or from a `.js` file with the same basename than the CDS model, for example:

```cds
service MyService @(impl:'cat-service.js'){...}
```

```sh
srv/cat-service.cds  #> CDS model with service definition
srv/cat-service.js   #> service implementation used by default
```



## cds. middlewares

For each service served at a certain protocol, the framework registers a configurable set of express middlewares by default like so:

```js
app.use (cds.middlewares.before, protocol_adapter)
```

The standard set of middlewares uses the following order:

```js
cds.middlewares.before = [
  context(),   // provides cds.context
  trace(),     // provides detailed trace logs when DEBUG=trace
  auth(),      // provides cds.context.user & .tenant
  ctx_model(), // fills in cds.context.model, in case of extensibility
]
```

::: warning _Be aware of the interdependencies of middlewares_ <!--  -->
_ctx_model_ requires that _cds.context_ middleware has run before.
_ctx_auth_ requires that _authentication_ has run before.
:::


### . context() {.method}

This middleware initializes [cds.context](events#cds-context) and starts the continuation. It's required for every application.


### . trace() {.method}

The tracing middleware allows you to do a first-level performance analysis. It logs how much time is spent on which layer of the framework when serving a request.
To enable this middleware, you can set for example the [environment variable](cds-log#debug-env-variable) `DEBUG=trace`.


### . auth() {.method}

[By configuring an authentication strategy](./authentication#strategies), a middleware is mounted that fulfills the configured strategy and subsequently adds the user and tenant identified by that strategy to [cds.context](events#cds-context).


### . ctx_model() {.method}

It adds the currently active model to the continuation. It's required for all applications using extensibility or feature toggles.


### .add(mw, pos?) {.method}

Registers additional middlewares at the specified position.
`mw` must be a function that returns an express middleware.
`pos` specified the index or a relative position within the middleware chain. If not specified, the middleware is added to the end.

```js
cds.middlewares.add (mw, {at:0}) // to the front
cds.middlewares.add (mw, {at:2})
cds.middlewares.add (mw, {before:'auth'})
cds.middlewares.add (mw, {after:'auth'})
cds.middlewares.add (mw) // to the end
```

<div id="beforecustomization" />


### Custom Middlewares

The configuration of middlewares must be done programmatically before bootstrapping the CDS services, for example, in a [custom server.js](cds-serve#custom-server-js).

The framework exports the default middlewares itself and the list of middlewares which run before the protocol adapter starts processing the request.

```js
cds.middlewares = {
  auth,
  context,
  ctx_model,
  errors,
  trace,
  before = [
    context(),
    trace(),
    auth(),
    ctx_model()
  ]
}
```

In order to plug in custom middlewares, you can override the complete list of middlewares or extend the list programmatically.

::: warning
Be aware that overriding requires constant updates as new middlewares by the framework are not automatically taken over.
:::

[Learn more about the middlewares default order.](#cds-middlewares){.learn-more}

#### Customization of `cds.context.user`

You can register middlewares to customize `cds.context.user`.
It must be done after authentication.
If `cds.context.tenant` is manipulated as well, it must also be done before `cds.context.model` is set for the current request.

```js
cds.middlewares.before = [
  cds.middlewares.context(),
  cds.middlewares.trace(),
  cds.middlewares.auth(),
  function ctx_user (_,__,next) {
    const ctx = cds.context
    ctx.user.id = '<my-idp>' + ctx.user.id
    next()
  },
  cds.middlewares.ctx_model()
]
```

#### Enabling Feature Flags

You can register middlewares to customize `req.features`.
It must be done before `cds.context.model` is set for the current request.

```js
cds.middlewares.before = [
  cds.middlewares.context(),
  cds.middlewares.trace(),
  cds.middlewares.auth(),
  function req_features (req,_,next) {
    req.features = ['<feature-1>', '<feature-2>']
    next()
  },
  cds.middlewares.ctx_model()
]
```

[Learn more about Feature Vector Providers.](../guides/extensibility/feature-toggles#feature-vector-providers){.learn-more}


### Current Limitations

- Configuration of middlewares must be done programmatically.



## cds. protocols

The framework provides adapters for OData V4 and REST out of the box. In addition, GraphQL can be served by using our open source package [`@cap-js/graphql`](https://github.com/cap-js/graphql).

By default, the protocols are served at the following path:
|protocol|path|
|---|---|
|OData V4|/odata/v4|
|REST|/rest|
|GraphQL|/graphql|

### @protocol

Configures at which protocol(s) a service is served.

```cds
@odata
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog

@protocol: 'odata'
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog

@protocol: ['odata', 'rest', 'graphql']
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog, /rest/catalog and /graphql

@protocol: [{ kind: 'odata', path: 'some/path' }]
service CatalogService {}
//> serves CatalogService at: /odata/v4/some/path
```

Note, that
- the shortcuts `@rest`, `@odata`, `@graphql` are only supported for services served at only one protocol.
- `@protocol` has precedence over the shortcuts.
- `@protocol.path` has precedence over `@path`.
- the default protocol is OData V4.
- `odata` is a shortcut for `odata-v4`.
- `@protocol: 'none'` will treat the service as _internal_.

### @path

Configures the path at which a service is served.

```cds
@path: 'browse'
service CatalogService {}
//> serves CatalogService at: /odata/v4/browse

@path: '/browse'
service CatalogService {}
//> serves CatalogService at: /browse
```

Be aware that using an absolute path will disallow serving the service at multiple protocols.

### PATCH vs. PUT vs. Replace

The HTTP method `PATCH` is meant for partial modification of an _existing resource_.
`PUT`, on the other hand, is meant for ensuring a resource exists
, that is, if it doesn't yet exists, it gets created.
If it does exist, it gets updated to reflect the request's content.

This content, however, may be incomplete.
By default, the values for not listed keys are not touched.
The rationale being that default values are known and clients have the option to send full representations, if necessary.

The following table shows the Node.js runtime's configuration options and their respective default value:

| Flag                                         | Behavior                                 | Default |
|----------------------------------------------|------------------------------------------|---------|
| <Config keyOnly>cds.runtime.patch_as_upsert </Config> | Create resource if it does not yet exist   | false   |
| <Config keyOnly>cds.runtime.put_as_upsert</Config>     | Create resource if it does not yet exist    | true    |
| <Config keyOnly>cds.runtime.put_as_replace</Config>   | Payload is enriched with default values  | false   |

### Custom Protocol Adapter

Similar to the configuration of the GraphQL Adapter, you can plug in your own protocol.
The `impl` property must point to the implementation of your protocol adapter.
Additional options for the protocol adapter are provided on the same level.

```js
cds.env.protocols = {
  'custom-protocol': { path: '/custom', impl: '<custom-impl.js>', ...options }
}
```

### Current Limitations

- Configuration of protocols must be done programmatically.
- Additional protocols do not respect `@protocol` annotation yet.
- The configured protocols do not show up in the `index.html` yet.