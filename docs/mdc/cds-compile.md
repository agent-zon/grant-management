---
status: released
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/855e00bd559742a3b8276fbed4af1008.html
---


# Parsing and Compiling Models



[[toc]]




## cds. compile (...) {.method}

```tsx
function cds.compile (
  model :
  	'*', 'file:<filename>' | filenames[] |  // source files
    CDL string | { CDL strings }           // sources in memory
  ,
  options : CSN_flavor | {
    flavor?    : CSN_flavor,
    min?       : boolean,
    docs?      : boolean,
    locations? : boolean,
    messages?  : []
  }
)
type CSN_flavor = 'parsed' | 'inferred'
```



This is the central function to compile models from files or in-memory sources to [CSN](../cds/csn).
It supports different variants based on the type of the first argument `model` as outlined below.

Depending on the variants, the method returns a Promise or a sync value.


### Compiling `.cds` files (async)

If the first argument is either a string starting with `"file:"`, or an _array_ of filenames, these files are read and compiled to a single CSN asynchronously:

```js
let csn = await cds.compile (['db','srv','app'])
let csn = await cds.compile ('*')
let csn = await cds.compile ('file:db')
```

> The given filenames are resolved to effective absolute filenames using [`cds.resolve`](#cds-resolve).

> [!TIP] Use <code>cds compile</code> as CLI equivalent
> The [`cds compile` CLI](../tools/cds-cli#cds-compile) is available as entry point to the functions described here.  For example, `cds compile --to hana` maps to `cds.compile.to.hana` etc.



### Single in-memory sources

If a single string, not starting with `file:`  is passed as first argument, it is interpreted as a CDL source string and compiled to CSN synchronously:

```js
let csn = cds.compile (`
  using {cuid} from '@sap/cds/common';
  entity Foo : cuid { foo:String }
  entity Bar as projection on Foo;
  extend Foo with { bar:String }
`)
```

> Note: `using from` clauses are not resolved in this usage.



### Multiple in-memory sources

Finally, you can pass an object with multiple named CDL or CSN sources, which allows to also resolve `using from` clauses:

```js
let csn = cds.compile ({
  'db/schema.cds': `
    using {cuid} from '@sap/cds/common';
    entity Foo : cuid { foo:String }
  `,
  'srv/services.cds': `
    using {Foo} from '../db/schema';
    entity Bar as projection on Foo;
    extend Foo with { bar:String }
  `,
  '@sap/cds/common.csn': `
    {"definitions":{
      "cuid": { "kind": "aspect", "elements": {
        "ID": { "key":true, "type": "cds.UUID" }
      }}
    }}
  `,
})
```





### Additional Options

You can pass additional options like so:

```js
let csn = await cds.compile('*',{ min:true, docs:true })
```



| Option      | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `flavor`    | By default the returned CSN is in `'inferred'` flavor, which is an effective model, with all aspects, includes, extensions and redirects applied and all views and projections inferred. Specify `'parsed'` to only have single models parsed. |
| `min`       | Specify `true` to have [`cds.minify()`](#cds-minify) applied after compiling the models. |
| `docs`      | Specify `true` to have the all `/** ... */` doc comments captured in the CSN. |
| `locations` | Specify `true` to have the all `$location` properties preserved in serialized CSN. |
| `messages`  | Pass an empty array to get all compiler messages collected in there. |




## cds. compile .to ... {.property}

Following are a collection of model processors which take a CSN as input and compile it to a target output. They can be used in two API flavors:

```js
let sql = cds.compile(csn).to.sql ({dialect:'sqlite'}) //> fluent
let sql = cds.compile.to.sql (csn,{dialect:'sqlite'}) //> direct
```


### .json() {.method}

```tsx
function cds.compile.to.json ( options: {
  indents : integer
})
```

Renders the given model to a formatted JSON string.

Option `indents` is the indent as passed to `JSON.stringify`.





### .yaml() {.method}

Renders the given model to a formatted JSON  or YAML string.



### .edm() {.method alt="The following documentation on .edmx also applies to .edm."}

### .edmx() {.method}


Compiles and returns an OData v4 [EDM](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part3-csdl.html), respectively [EDMX](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part3-csdl.html) model object for the passed in model, which is expected to contain at least one service definition.

Accepted `options` are the same [as documented for `cds.compile`](#additional-options), with one addition: If the model contains more than one service definition, use `{service:...}` option parameter to:

* Either choose exactly one, for example, `{service:'Catalog'}`
* Choose to return EDM objects for all, that means, `{service:'all'}`

In case of the latter, a generator is returned that yields `[ edm, {file, suffix} ]` for each service.
For example, use it as follows:

```js
// for one service
let edm = cds.compile.to.edm (csn, {service:'Catalog'})
console.log (edm)
```
```js
// for all services
let all = cds.compile.to.edm (csn, {service:'all'})
for (let [edm,{file,suffix}] of all)
  console.log (file,suffix,edm)
```

### .hdbtable() {.method .deprecated}

Use [`cds.compile.to.hana`](#hana) instead.

### .hana() <Since version="8.0.0" of="@sap/cds" /> {.method}

Generates `hdbtable/hdbview` output.

Returns a generator function that produces `[ content, {file} ]` for each artifact. The variable `content` contains the SQL DDL statements for the `.hdb*` artifacts, and `file` is the filename.

For example, use it as follows:

```js
const all = cds.compile.to.hana(csn);
for (const [content, { file }] of all) {
  console.log(file, content);
}
```

Additional data for `.hdbmigrationtable` files is calculated if a `beforeImage` parameter is passed in. This is only relevant for build tools to determine the actual migration table changes.

### .sql() {.method}


Generates SQL DDL statements for the given model.
The default returns an array with the generated statements.

Accepted `options` are:

- `dialect`: _'plain' \| 'sqlite' \| 'postgres' \| 'h2'_ &rarr; chooses the dialect to generate
- `names`: _'plain' \| 'quoted'_ &rarr; allows to generate DDL using quoted names
- `as`: _'str'_ &rarr; returns a string with concatenated DDL statements.

Examples:
```js
let ddls1 = cds.compile(csn).to.sql()
let ddls2 = cds.compile(csn).to.sql({dialect:'plain'})
let script = cds.compile(csn).to.sql({as:'str'})
```



### .cdl() {.method}

Reconstructs [CDL](../cds/cdl.md) source code for the given csn model.



### .asyncapi() {.method}


Convert the CSN file into an AsyncAPI document:

```js
const doc = cds.compile.to.asyncapi(csn_file)
```







## cds. load (files) {.method #cds-load }

Loads and parses a model from one or more files into a single effective model.
It's essentially a [shortcut to `cds.compile ([...])`](#cds-compile). In addition emits event `cds 'loaded'`.

Declaration:

```tsx
function cds.load (
  files : filename || filenames[]
  options : {...} //> as in cds.compile
)
```

Usage examples:

```js
// load a model from a single source
const csn = await cds.load('my-model')
```

```js
// load a a model from several sources
const csn = await cds.load(['db','srv'])
```

> The given filenames are resolved using [`cds.resolve()`](#cds-resolve).
>
>  Note: It's recommended to omit file suffixes to leverage automatic loading from precompiled _[CSN](../cds/csn)_ files instead of _[CDL](../cds/cdl.md)_ sources.



## cds. parse() { .method }

This is an API facade for a set of functions to parse whole [CDL](../cds/cdl) models, individual [CQL](../cds/cql) queries, or CQL expressions.
The three main methods are offered as classic functions, as well as [tagged template string functions](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Template_literals).



### cds. parse. cdl() {.method #parse-cdl }

Parses a source string in _[CDL](../cds/cdl)_ syntax and returns it as a parsed model according to the [_CSN spec_](../cds/csn). Supports tagged template strings as well as plain string arguments.
It's essentially a [shortcut to `cds.compile (..., {flavor:'parsed'})`](#cds-compile).

Examples:
```js
let csn = cds.parse.cdl (`entity Foo{}`)
let csn = cds.parse.cdl `entity Foo{}`
let csn = cds.parse `entity Foo{}`  //> shortcut to the above
```



### cds. parse. cql() {.method #parse-cql }

Parses a source string in _[CQL](../cds/cql)_ syntax and returns it as a parsed query according to the [_CQN spec_](../cds/cqn). Supports tagged template strings as well as plain string arguments.

Examples:
```js
let cqn = cds.parse.cql (`SELECT * from Foo`)
let cqn = cds.parse.cql `SELECT * from Foo`
```



### cds. parse. expr() {.method #parse-cxl }

Parses a source string in CQL expression syntax and returns it as a parsed expression according to the [_CQN Expressions spec_](../cds/cxn#operators). Supports tagged template strings as well as plain string arguments.

Examples:
```js
[dev] cds repl
> let cxn = cds.parse.expr (`foo.bar > 9`)
> let cxn = cds.parse.expr `foo.bar > 9` //> both return:
{xpr:[ {ref:['foo', 'bar']}, '>', {val:9} ] }
```



### cds. parse. xpr() {.method}

Convenience shortcut to `cds.parse.expr(x).xpr`

Example:
```js
[dev] cds repl
> let xpr = cds.parse.xpr (`foo.bar > 9`) // [!code focus]
[ {ref:['foo', 'bar']}, '>', {val:9} ]
```



### cds. parse. ref() {.method}

Convenience shortcut to `cds.parse.expr(x).ref`

Example:
```js
[dev] cds repl
> let ref = cds.parse.ref (`foo.bar`) // [!code focus]
['foo', 'bar']
```







## cds. minify() {.method}

Minifies a given CSN model by removing all unused<sup>1</sup> types and aspects, as well all entities tagged with `@cds.persistence.skip:'if-unused'`. Use it like that:

```js
let csn = await cds.load('*').then(cds.minify)
```

Using `cds.minify()` is particularly relevant, when reuse models are in the game. For example, this applies to [`@sap/cds/common`](../cds/common). In there, all code list entities like *Countries*, *Currencies* and *Languages* are tagged with `@cds.persistence.skip:'if-unused'`. For example, run this in *cap/samples/bookshop*:

```sh
[bookshop] DEBUG=minify cds -e "cds.load('*').then(cds.minify)"
```
... would generate this output, informing which definitions got skipped:
```sh
[minify] - skipping type Language
[minify] - skipping type Country
[minify] - skipping context sap.common
[minify] - skipping entity sap.common.Languages
[minify] - skipping entity sap.common.Countries
[minify] - skipping aspect cuid
[minify] - skipping aspect temporal
[minify] - skipping aspect extensible
[minify] - skipping entity sap.common.Languages.texts
[minify] - skipping entity sap.common.Countries.texts
```

<sup>1</sup> Unused in that context means, not reachable from roots services and — non-skipped — entities in the model.



## cds. resolve() {.method}

Resolves the given source paths by fetching matching model source files, that is _.cds_ or _.csn_ files, including models for required services.
In detail, it works as follows:

1. If `paths` is `'*'`: `paths` = [ ...`cds.env.roots`, ...`cds.requires.<srv>.model` ]
2. If `paths` is a single string: `paths` = [ `paths` ]
3. For `<each>` in `paths`: ...
- if _\<each>.csn|cds_ exists &rarr; use it
- if _\<each>/index.csn|cds_ exists &rarr; use it
- if _\<each>_ is a folder &rarr; use all _.csn|cds_ found in there

[Learn more about `cds.env`](cds-env){.learn-more}

In effect, it resolves and returns an array with the absolute filenames of the root cds model files to be used to invoke the compiler.

If no files are found, `undefined` is returned.

Examples:

```js
[dev] cds repl
> cds.env.folders           // = folders db, srv, app by default
> cds.env.roots             // + schema and services in cwd
> cds.resolve('*',false)    // + models in cds.env.requires
> cds.resolve('*')          // > the resolved existing files
> cds.resolve(['db'])       // > the resolved existing files
> cds.resolve(['db','srv']) // > the resolved existing files
> cds.resolve('none')       // > undefined
```
> Try this in cds repl launched from your project root to see that in action.


## Lifecycle Events

The following [lifecycle events](cds-facade#lifecycle-events) are emitted via the `cds` facade object during the server bootstrapping process.
You can register event handlers using `cds.on()` like so:


```js
const cds = require('@sap/cds')
cds.on('compile.for.runtime', ...)
cds.on('compile.to.dbx', ...)
cds.on('compile.to.edmx', ...)
```

> [!warning]
> As we're using Node's standard [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
> event handlers execute **synchronously** in the order they are registered.

> [!tip] Note that several of these events could be emitted for the same model, so ensure your handlers are idempotent.


### compile.for.runtime {.event}

A one-time event, emitted before the model is compiled for usage in Node.js or Java runtime.
This is the right place to, for example, add custom elements required at runtime.


### compile.to.dbx {.event}

A one-time event, emitted before database-specific artifacts, i.e. SQL DDL scripts, are generated from the model.
This is the right place to, for example, add custom elements required in your persistence.


### compile.to.edmx {.event}

A one-time event, emitted immediately before the model is compiled to edmx.
This is the right place to add custom transformations to the model, for example, to add custom Fiori annotations.


----
---
shorty: cds.connect
# layout: node-js
status: released
---

# Connecting to Required Services

Services frequently consume other services, which could be **local** services served by the same process, or **external** services, for example consumed through OData.
The latter include **database** services. In all cases use `cds.connect` to connect to such services, for example, from your:


[[toc]]


## Connecting to Required Services { #cds-connect-to }



### cds. connect.to () {.method}

Use `cds.connect.to()` to connect to services configured in a project's `cds.requires` configuration.

```js
const ReviewsService = await cds.connect.to('ReviewsService')
```

The method returns a _Promise_ resolving to a _[Service](../cds/cdl#services)_ instance which acts as a client proxy to the service's API, allowing you to call its methods and access its data using common [`cds.Service`](core-services#consuming-services) methods, e.g.:

```js
let reviews = await ReviewsService.read ('Reviews')
```


**Arguments** are as follows:

```ts:no-line-numbers
async function cds.connect.to (
  name? : string,  // reference to an entry in `cds.requires` config
  options? : {
    kind : string  // reference to a preset in `cds.requires.kinds` config
    impl : string  // module name of the implementation
  }
) : Promise<Service>
```

Argument `name` is used to look up connect options from [configured services](#cds-env-requires), which are defined in the `cds.requires` section of your _package.json_ or _.cdsrc.json_ or _.yaml_ files.

Argument `options` also allows to pass additional options such as `credentials` programmatically, and thus create services without configurations and [service bindings](#service-bindings), for example, you could connect to a local SQLite database in your tests like this:

```js
const db2 = await cds.connect.to ({
  kind: 'sqlite', credentials: { url: 'db2.sqlite' }
})
```


### cds. services {#cds-connect-caching .property}

When connecting to a service using `cds.connect.to()`, the service instance is cached in [`cds.services`](cds-facade#cds-services) under the service name. This means that subsequent calls to `cds.connect.to()` with the same service name will all return the same instance. As services constructed by [`cds.serve`](cds-serve#cds-serve) are registered with [`cds.services`](cds-facade#cds-services) as well, a connect finds and returns them as local service connections.

You can also access cached service instance like this:

```js
const { ReviewsService } = cds.services
```

> Note: If _ad-hoc_ options are provided, the instance is not cached.



## Configuring Required Services {#cds-env-requires }

To configure required remote services in Node.js, simply add respective entries to the `cds.requires` sections in your _package.json_ or in _.cdsrc.json_ or _.yaml_. These configurations are constructed as follows:

::: code-group

```json [package.json]
{"cds":{
  "requires": {
    "db": { "kind": "sqlite", "credentials": { "url":"db.sqlite" }},
    "ReviewsService": {
      "kind": "odata", "model": "@capire/reviews"
    },
    "OrdersService": {
      "kind": "odata", "model": "@capire/orders"
    },
  }
}}
```

```yaml [.cdsrc.yaml]
cds:
  requires:
    db:
      kind: sqlite
      credentials:
        url: db.sqlite
    ReviewsService:
      kind: odata,
      model: @capire/reviews
    OrdersService:
      kind: odata,
      model: @capire/orders
```

:::

Entries in this section tell the service loader to not serve that service as part of your application, but expects a service binding at runtime in order to connect to the external service provider. The options are as follows:


### cds.requires.<i>\<srv\></i>`.impl`

Service implementations are ultimately configured in `cds.requires` like that:

```json
"cds": { "requires": {
  "some-service": { "impl": "some/node/module/path" },
  "another-service": { "impl": "./local/module/path" }
}}
```

Given that configuration, `cds.connect.to('some-service')` would load the specific service implementation from `some/node/module/path`.
Prefix the module path in `impl` with `./` to refer to a file relative to your project root.


### cds.requires.<i>\<srv\></i>`.kind`

As service configurations inherit from each other along `kind` chains, we can refer to default configurations shipped with `@sap/cds`, as you commonly see that in our [_cap/samples_](https://github.com/capire/samples), like so:

```json
"cds": { "requires": {
  "db": { "kind": "sqlite" },
  "remote-service": { "kind": "odata" }
}}
```

This is backed by these default configurations:

```json
"cds": { "requires": {
  "sqlite": { "impl": "[...]/sqlite/service" },
  "odata": { "impl": "[...]/odata/service" },
}}
```

> Run `cds env get requires` to see all default configurations.
> Run `cds env get requires.db.impl` to see the impl used for your database.

Given that configuration, `cds.connect.to('db')` would load the generic service implementation.

[Learn more about `cds.env`.](cds-env){.learn-more}


### cds.requires.<i>\<srv\></i>`.model`

Specify (imported) models for remote services in this property. This allows the service runtime to reflect on the external API and add generic features. The value can be either a single string referring to a CDS model source, resolved as absolute node module, or relative to the project root, or an array of such.

```json
"cds": { "requires": {
  "remote-service": { "kind": "odata", "model":"some/imported/model" }
}}
```

Upon [bootstrapping](./cds-serve), all these required models will be loaded and compiled into the effective [`cds.model`](cds-facade#cds-model) as well.


### cds.requires.<i>\<srv\></i>`.service`

If you specify a model, then a service definition for your required service must be included in that model. By default, the name of the service that is checked for is the name of the required service. This can be overwritten by setting `service` inside the required service configuration.

```json
"cds": { "requires": {
  "remote-service": { "kind": "odata", "model":"some/imported/model", "service": "BusinessPartnerService" }
}}
```

The example specifies `service: 'BusinessPartnerService'`, which results in a check for a service called `BusinessPartnerService` instead of `remote-service` in the model loaded from `some/imported/model`.




## Service Bindings {#service-bindings}

A service binding connects an application with a cloud service. For that, the cloud service's credentials need to be injected in the CDS configuration:

```jsonc
{
  "requires": {
    "db": {
      "kind": "hana",
      "credentials": { /* from service binding */ }
    }
  }
}
```


### cds.requires.<i>\<srv\></i>.credentials

All service binding information goes into this property. It's filled from the process environment when starting server processes, managed by deployment environments. Service bindings provide the details about how to reach a required service at runtime, that is, providing requisite credentials, most prominently the target service's `url`.


You specify the credentials to be used for a service by using one of the following:

- Process environment variables
- Command line options
- File system
- Auto binding

For example, in development, you can add them to a _.env_ file as follows:

```properties
# .env file
cds.requires.remote-service.credentials = { "url":"http://...", ... }
```

::: warning ❗ Never add secrets or passwords to _package.json_ or _.cdsrc.json_!
General rule of thumb: `.credentials` are always filled (and overridden) from process environment on process start.
:::



### Basic Mechanism {#bindings-via-cds-env}


The CAP Node.js runtime expects to find the service bindings in `cds.env.requires`.

1. Configured required services constitute endpoints for service bindings.

   ```json
   "cds": {
     "requires": {
       "ReviewsService": {...},
      }
   }
   ```

2. These are made available to the runtime via `cds.env.requires`.

   ```js
   const { ReviewsService } = cds.env.requires
   ```

3. Service Bindings essentially fill in `credentials` to these entries.

   ```js
   const { ReviewsService } = cds.env.requires
   ReviewsService.credentials = {
     url: "http://localhost:4005/reviews"
   }
   ```

The latter is appropriate in test suites. In productive code, you never provide credentials in a hard-coded way. Instead, use one of the options presented in the following sections.




### In Cloud Foundry {#bindings-in-cloud-platforms}

Find general information about how to configure service bindings in Cloud Foundry:

- [Deploying Services using MTA Deployment Descriptor](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/33548a721e6548688605049792d55295.html)
- [Binding Service Instances to Cloud Foundry Applications](https://help.sap.com/docs/SERVICEMANAGEMENT/09cc82baadc542a688176dce601398de/0e6850de6e7146c3a17b86736e80ee2e.html)
- [Binding Service Instances to Applications using the Cloud Foundry CLI](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/296cd5945fd84d7d91061b2b2bcacb93.html)

Cloud Foundry uses auto configuration of service credentials through the `VCAP_SERVICES` environment variable.

[Learn more about environment variables on Cloud Foundry and `cf env`.](https://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html){.learn-more}



#### Through `VCAP_SERVICES` env var {#vcap_services}

When deploying to Cloud Foundry, service bindings are provided in `VCAP_SERVICES` process environment variables, which is JSON-stringified array containing credentials for multiple services. The entries are matched to the entries in `cds.requires` as follows, in order of precedence:

1. The service's `name` is matched against the `name` property of `VCAP_SERVICE` entries
2. The service's `name` is matched against the `binding_name` property
3. The service's `name` is matched against entries in the `tags` array
4. The service's `kind` is matched against entries in the `tags` array
5. The service's `kind` is matched against the `label` property, for example, 'hana'
6. The service's `kind` is matched against the `type` property (The type property is only relevant for [servicebinding.io](https://servicebinding.io) bindings)
7. The service's `vcap.name` is matched against the `name` property

All the config properties found in the first matched entry will be copied into the <Config>cds.requires.\<srv\>.credentials</Config> property.

Here are a few examples:

<style scoped>
  .no-stripes tr:nth-child(2n) {
    background-color:unset;
  }
</style>

<table class="no-stripes">
<thead>
<tr>
<th>CAP config</th>
<th>VCAP_SERVICES</th>
</tr>
</thead>
<tbody>
<tr >
<td >

```json
{
  "cds": {
    "requires": {
      "db": { ... }
    }
  }
}
```
</td>
<td >

```json
{
  "VCAP_SERVICES": {
    "hana": [{
      "name": "db", ...
    }]
  }
}
```
</td>
</tr>
<tr >
<td >

```json
{
  "cds": {
    "requires": {
      "db": { "kind": "hana" }
    }
  }
}
```
</td>
<td >

```json
{
  "VCAP_SERVICES": {
    "hana": [{
      "label": "hana", ...
    }]
  }
}
```
</td>
</tr>
<tr >
<td >

```json
{
  "cds": {
    "requires": {
      "db": {
        "vcap": { "name": "myDb" }
      }
    }
  }
}
```
</td>
<td >

```json
{
  "VCAP_SERVICES": {
    "hana": [{
      "name": "myDb",
      ...
    }]
  }
}
```
</td>
</tr>
</tbody>
</table>

If the `vcap` configuration contains multiple properties such as `name`, `label`, `tags`, `plan`, all properties have to match the corresponding VCAP_SERVICE attributes:

<style scoped>
  .no-stripes tr:nth-child(2n) {
    background-color:unset;
  }
</style>

<table class="no-stripes">
<thead>
<tr>
<th>CAP config</th>
<th>VCAP_SERVICES</th>
</tr>
</thead>
<tbody>
<tr >
<td >


```json
{
  "cds": {
    "requires": {
      "hana": {
        "vcap": {
          "label": "hana",
          "plan": "standard",
          "name": "myHana",
          "tags": "database"
        }
      }
    }
  }
}
```
</td>
<td >

```json
{
  "VCAP_SERVICES": {
    "hana": [{
      "label": "hana",
      "plan": "standard",
      "name": "myHana",
      "tags": ["database"]
    }]
  }
}
```
</td>
</tr>
</tbody>
</table>

CAP services often come with a default `vcap` configuration. In rare cases, the default configuration has to be deactivated which can be achieved by explicitly setting the service property `vcap.<property>` to `false`:

<style scoped>
  .no-stripes tr:nth-child(2n) {
    background-color:unset;
  }
</style>

<table class="no-stripes">
<thead>
<tr>
<th>CAP config</th>
<th>VCAP_SERVICES</th>
</tr>
</thead>
<tbody>
<tr >
<td >


```json
{
  "cds": {
    "requires": {
      "hana": {
        "vcap": {
          "label": false,
          "name": "myHana",
          "tags": "database"
        }
      }
    }
  }
}
```
</td>
<td >

```json
{
  "VCAP_SERVICES": {
    "myHana-binding": [{
      "label": "not-hana",
      "plan": "standard",
      "name": "myHana",
      "tags": ["database"]
    }]
  }
}
```
</td>
</tr>
</tbody>
</table>

::: tip To see the default configuration of a CAP service, use:

```js
cds env get requires.<servicename>
```
:::

### In Kubernetes / Kyma { #in-kubernetes-kyma}

CAP supports [servicebinding.io](https://servicebinding.io/) service bindings and SAP BTP service bindings created by the [SAP BTP Service Operator](https://github.com/SAP/sap-btp-service-operator).

1. Specify a root directory for all service bindings using `SERVICE_BINDING_ROOT` environment variable:

    ```yaml
    spec:
      containers:
      - name: bookshop-srv
        env:
        # ...
        - name: SERVICE_BINDING_ROOT
          value: /bindings
    ```

2. Create service bindings

    Use the `ServiceBinding` custom resource of the [SAP BTP Service Operator](https://github.com/SAP/sap-btp-service-operator) to create bindings to SAP BTP services:

    ```yaml
    apiVersion: services.cloud.sap.com/v1alpha1
    kind: ServiceBinding
    metadata:
      name: bookshop-xsuaa-binding
    spec:
      serviceInstanceName: bookshop-xsuaa-binding
      externalName: bookshop-xsuaa-binding
      secretName: bookshop-xsuaa-secret
    ```

    Bindings to other services need to follow the [servicebinding.io workload projection specification](https://servicebinding.io/spec/core/1.0.0-rc3/#workload-projection).

3. Mount the secrets of the service bindings underneath the root directory:

    ```yaml
    spec:
      containers:
      - name: bookshop-srv
        # ...
        volumeMounts:
        - name: bookshop-auth
          mountPath: "/bindings/auth"
          readOnly: true
      volumes:
      - name: bookshop-auth
        secret:
          secretName: bookshop-xsuaa-secret
    ```

    The `secretName` property refers to an existing Kubernetes secret, either manually created or by the `ServiceBinding` resource. The name of the sub directory (`auth` in the example) is recognized as the binding name.

CAP services receive their credentials from these bindings [as if they were provided using VCAP_SERVICES](#vcap_services).

<!-- todo: add link once BTP Service Operator migration is finished and doc is updated:

[Binding Service Instances to Kyma runtime](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/d1aa23c492694d669c89a8d214f29147.html){.learn-more}

-->

#### Through environment variables {#env-service-bindings}

All values of a secret can be added as environment variables to a pod. A prefix can be prepended to each of the environment variables. To inject the values from the secret in the right place of your CDS configuration, you use the configuration path to the `credentials` object of the service as the prefix:

`cds_requires_<your service>_credentials_`

Please pay attention to the underscore ("`_`") character at the end of the prefix.

*Example:*

```yaml
  spec:
    containers:
    - name: app-srv
      # ...
      envFrom:
        - prefix: cds_requires_db_credentials_
          secretRef:
            name: app-db
```

::: warning
For the _configuration path_, you **must** use the underscore ("`_`") character as delimiter. CAP supports dot ("`.`") as well, but Kubernetes won't recognize variables using dots. Your _service name_ **mustn't** contain underscores.
:::


#### Through the file system {#file-system-service-bindings}

CAP can read configuration from a file system by specifying the root path of the configuration in the `CDS_CONFIG` environment variable.

Set `CDS_CONFIG` to the path that should serve as your configuration root, for example: `/etc/secrets/cds`.

Put the service credentials into a path that is constructed like this:

`<configuration root>/requires/<your service>/credentials`

Each file will be added to the configuration with its name as the property name and the content as the value. If you have a deep credential structure, you can add further sub directories or put the content in a file as a JSON array or object.

For Kubernetes, you can create a volume with the content of a secret and mount it on your container.

*Example:*

```yaml
  spec:
    volumes:
      - name: app-db-secret-vol
        secret:
          secretName: app-db
    containers:
    - name: app-srv
      # ...
      env:
        - name: CDS_CONFIG
          value: /etc/secrets/cds
      volumeMounts:
        - name: app-db-secret-vol
          mountPath: /etc/secrets/cds/requires/db/credentials
          readOnly: true
```

#### Provide Service Bindings (`VCAP_SERVICES`) {#provide-service-bindings}

If your application runs in a different environment than Cloud Foundry, the `VCAP_SERVICES` env variable is not available. But it may be needed by some libraries, for example the SAP Cloud SDK.

By enabling the CDS feature `features.emulate_vcap_services`, the `VCAP_SERVICES` env variable will be populated from your configured services.

For example, you can enable it in the _package.json_ file for your production profile:

```json
{
  "cds": {
    "features": {
      "[production]": {
        "emulate_vcap_services": true
      }
    }
  }
}
```

::: warning
This is a backward compatibility feature.<br> It might be removed in a next [major CAP version](../releases/schedule#yearly-major-releases).
:::

Each service that has credentials and a `vcap.label` property is put into the `VCAP_SERVICES` env variable. All properties from the service's `vcap` object will be taken over to the service binding.

The `vcap.label` property is pre-configured for some services used by CAP.

For example, for the XSUAA service you only need to provide credentials and the service kind:

```json
{
  "requires": {
    "auth": {
      "kind": "xsuaa",
      "credentials": {
        "clientid": "cpapp",
        "clientsecret": "dlfed4XYZ"
      }
    }
  }
}
```

The `VCAP_SERVICES` variable is generated like this:

```json
{
  "xsuaa": [
    {
      "label": "xsuaa",
      "tags": [ "auth" ],
      "credentials": {
        "clientid": "cpapp",
        "clientsecret": "dlfed4XYZ"
      }
    }
  ]
}
```

The generated value can be displayed using the command:

```sh
cds env get VCAP_SERVICES --process-env
```

A list of all services with a preconfigured `vcap.label` property can be displayed with this command:

```sh
cds env | grep vcap.label
```

You can include your own services by configuring `vcap.label` properties in your CAP configuration.

For example, in the _package.json_ file:

```json
{
  "cds": {
    "requires": {
      "myservice": {
        "vcap": {
          "label": "myservice-label"
        }
      }
    }
  }
}
```

The credentials can be provided in any supported way. For example, as env variables:

```sh
cds_requires_myservice_credentials_user=test-user
cds_requires_myservice_credentials_password=test-password
```

The resulting `VCAP_SERVICES` env variable looks like this:

```json
{
  "myservice-label": [
    {
      "label": "myservice-label",
      "credentials": {
        "user": "test-user",
        "password": "test-password"
      }
    }
  ]
}
```




### Through _.cdsrc-private.json_ File for Hybrid Testing

[Learn more about hybrid testing using _.cdsrc-private.json_.](../advanced/hybrid-testing#bind-to-cloud-services)

```json
{
  "requires": {
    "ReviewsService": {
      "credentials": {
        "url": "http://localhost:4005/reviews"
      }
    },
    "db": {
      "credentials": {
        "url": "db.sqlite"
      }
    }
  }
}
```

::: warning
Make sure that the _.cdsrc-private.json_ file is not checked into your project.
:::

### Through `process.env` Variables {#bindings-via-process-env}

You could pass credentials as process environment variables, for example in ad-hoc tests from the command line:

```sh
export cds_requires_ReviewsService_credentials_url=http://localhost:4005/reviews
export cds_requires_db_credentials_database=sqlite.db
cds watch fiori
```

#### In _.env_ Files for Local Testing

Add environment variables to a local _.env_ file for repeated local tests:

```properties
cds.requires.ReviewsService.credentials = { "url": "http://localhost:4005/reviews" }
cds.requires.db.credentials.database = sqlite.db
```
> Never check in or deploy such _.env_ files!

<div id="endofconnect" />



## Importing Service APIs



## Mocking Required Services

----

---
status: released
---



# The *cds* Façade Object {#title}



The `cds` facade object provides access to all CAP Node.js APIs. Use it like that:

```js
const cds = require('@sap/cds')
let csn = cds.compile(`entity Foo {}`)
```

::: tip Use `cds repl` to try out things
For example, like this to get the compiled CSN for an entity `Foo`:
```js
[dev] cds repl
Welcome to cds repl v 7.3.0
> cds.compile(`entity Foo { key ID : UUID }`)
{ definitions: {
  Foo: { kind: 'entity', elements: { ID: { key: true, type: 'cds.UUID' } } }
}}
```
:::



## Refs to Submodules

Many properties of cds are references to submodules, which are lazy-loaded on first access to minimize bootstrapping time and memory consumption. The submodules are documented in separate documents.

- [cds. model](cds-facade#cds-model) {.property}
  - [cds. resolve()](cds-compile#cds-resolve) {.method}
  - [cds. load()](cds-compile#cds-load) {.method}
  - [cds. parse()](cds-compile#cds-parse) {.method}
  - [cds. compile](cds-compile) {.method}
  - [cds. linked()](cds-reflect) {.method}
- [cds. server](cds-server) {.property}
- [cds. serve()](cds-serve) {.method}
  - cds. services {.property}
  - cds. middlewares {.property}
  - cds. protocols {.property}
  - cds. auth {.property}
- [cds. connect](cds-connect) {.property}
- [cds. ql](cds-ql) {.property}
- [cds. tx()](cds-tx) {.method}
- [cds. log()](cds-log) {.method}
- [cds. env](cds-env) {.property}
- [cds. auth](authentication) {.property}
- [cds. i18n](cds-i18n) {.property}
- [cds. test](cds-test) {.property}
- [cds. utils](cds-utils) {.property}

<br>

Import classes and functions through the facade object only:

##### **Good:** {#import-good .good}

```ts
const { Request } = require('@sap/cds') // [!code ++]
```

##### **Bad:** {#import-bad .bad}

Never code against paths inside `@sap/cds/`:

```ts
const Request = require('@sap/cds/lib/.../Request') // [!code --]
```

## Builtin Types & Classes

Following properties provide access to the classes and prototypes of [linked CSNs](cds-reflect).

### [cds. builtin .types](cds-reflect#cds-builtin-types) {.property}
### [cds. linked .classes](cds-reflect#cds-linked-classes) {.property}

The following top-level properties are convenience shortcuts to their counterparts in `cds.linked.classes`. <br>
For example:

```js
cds.entity === cds.linked.classes.entity
```

  - [cds. Association](cds-reflect#cds-association) {.property}
  - [cds. Composition](cds-reflect#cds-linked-classes) {.property}
  - [cds. entity](cds-reflect#cds-entity) {.property}
  - [cds. event](cds-reflect#cds-linked-classes) {.property}
  - [cds. type](cds-reflect#cds-linked-classes) {.property}
  - [cds. array](cds-reflect#cds-linked-classes) {.property}
  - [cds. struct](cds-reflect#cds-struct) {.property}
  - [cds. service](cds-reflect#cds-struct) {.property}



## Core Classes

### [cds. Service](core-services#core-services) {.class}

- [cds. ApplicationService](app-services) {.class}
- [cds. RemoteService](remote-services) {.class}
- [cds. MessagingService](messaging) {.class}
- [cds. DatabaseService](databases) {.class}
- [cds. SQLService](databases) {.class}

### [cds. EventContext](events#cds-event-context) {.class}
### [cds. Event](events#cds-event) {.class}
### [cds. Request](events#cds-request) {.class}
### [cds. User](authentication#cds-user) {.class}




## Properties

Following are properties which are not references to submodules.



### cds. version {.property}

Returns the version of the `@sap/cds` package from which the current instance of the `cds` facade module was loaded. For example, use that to write version specific code:

```js
const [major, minor] = cds.version.split('.').map(Number)
if (major < 6) // code for pre cds6 usage
```




### cds. home {.property}

Returns the pathname of the `@sap/cds` installation folder from which the current instance of the `cds` facade module was loaded.

```js
[dev] cds repl
> cds.home // [!code focus]
~/.npm/lib/node_modules/@sap/cds
```



### cds. root {.property}

Returns the project root that is used by all CAP runtime file access as the root directory.
By default this is `process.cwd()`, but can be set to a different root folder.
It's guaranteed to be an absolute folder name.

```js
// Print current project's package name
let package_json = path.join (cds.root,'package.json') // [!code focus]
let { name, description } = require(package_json)
console.log ({ name, description })
```



### cds. cli {.property}

Provides access to the parsed effective `cds` cli command and arguments. Example: If you would add log respective output in a project-local `server.js`, and start your server with `cds watch`, you'd see an output like this:

```js
Trace : {
  command: 'serve',
  argv: [ 'all' ],
  options: {
    'with-mocks': true,
    'in-memory?': true
  }
}
```

For example, [`cds-plugins`](cds-serve) can use that to plug into different parts of the framework for different commands being executed.

Known values for `cds.cli.command` are `add`, `build`, `compile`, `deploy`, `import`, `init`, `serve`.
`cds watch` is normalized to `serve`.

### cds. entities {.property}

Is a shortcut to `cds.model.entities`. Used as a function, you can [specify a namespace](/node.js/cds-reflect#entities).

### cds. env {.property}

Provides access to the effective configuration of the current process, transparently from various sources, including the local _package.json_ or _.cdsrc.json_, service bindings and process environments.

```js
[dev] cds repl
> cds.env.requires.auth // [!code focus]
{
  kind: 'basic-auth',
  strategy: 'mock',
  users: {
    alice: { tenant: 't1', roles: [ 'admin' ] },
    bob: { tenant: 't1', roles: [ 'cds.ExtensionDeveloper' ] },
    # ...,
    '*': true
  },
  tenants: {
    t1: { features: [ 'isbn' ] },
    t2: { features: '*' }
  }
}
```

[Learn more about `cds.env`](cds-env){.learn-more}


### cds. requires {.property}

... is an overlay and convenience shortcut to [`cds.env.requires`](#cds-env), with additional entries for services with names different from the service definition's name in cds models. For example, given this service definition:

```cds
service ReviewsService {}
```

... and this configuration:

```jsonc
{ "cds": {
  "requires": {
    "db": "sqlite",
    "reviews" : {                  // lookup name
      "service": "ReviewsService"  // service definition's name
    }
  }
}}
```

You can access the entries as follows:

```js
[dev] cds repl
> cds.env.requires.db              //> the effective config for db
> cds.env.requires.reviews         //> the effective config for reviews
> cds.env.requires.ReviewsService  //> undefined
```

```js
[dev] cds repl
> cds.requires.db                  //> the effective config for db
> cds.requires.reviews             //> the effective config for reviews
> cds.requires.ReviewsService      //> same as cds.requires.reviews
```

The additional entries are useful for code that needs to securely access the service by cds definition name.

Note: as `cds.requires` is an overlay to `cds.env.requires`, it inherits all properties from there via prototype chain. In effect using operations which only look at *own* properties, like `Object.keys()` behave different than for `cds.env.requires`:

```js
[dev] cds repl
> Object.keys(cds.env.requires) //> [ 'db', 'reviews' ]
> Object.keys(cds.requires)     //> [ 'ReviewsService' ]
```





### cds. services {.property}

A dictionary and cache of all instances of [`cds.Service`](core-services) constructed through [`cds.serve()`](cds-serve),
or connected to by [`cds.connect()`](cds-connect).

It's an *iterable* object, so can be accessed in the following ways:

```js
let { CatalogService, db } = cds.services
let all_services = [ ... cds.services ]
for (let k in cds.services) //... k is a services's name
for (let s of cds.services) //... s is an instance of cds.Service
```



### cds. context {.property}

Provides access to common event context properties like `tenant`, `user`, `locale` as well as the current root transaction for automatically managed transactions.

[Learn more about that in reference docs for `cds.tx`.](./cds-tx){.learn-more}



### cds. model {.property}

The effective [CDS model](../cds/csn) loaded during bootstrapping, which contains all service and entity definitions, including required services. Many framework operations use that as a default where models are required. It is loaded in built-in `server.js` like so:

```js
cds.model = await cds.load('*')
```

[Learn more about bootstrapping in `cds.server`.](./cds-serve){.learn-more}




### cds. app {.property}

The [express.js Application object](https://expressjs.com/de/4x/api.html#app) constructed during bootstrapping. Several framework operations use that to add express handlers or middlewares. It is initialised in built-in `server.js` like so:

```js
cds.app = require('express')()
```

[Learn more about bootstrapping in `cds.server`.](./cds-serve){.learn-more}




### cds. db {.property}

A shortcut to [`cds.services.db`](#cds-services), the primary database connected to during bootstrapping. Many framework operations use that to address and interact with the primary database. In particular that applies to the global [`cds.ql`](cds-ql) statement objects. For example:

```js
let books = await SELECT.from(Books) // is a shortcut for:
let books = await cds.db.run ( SELECT.from(Books) )
```

It is initialized in built-in `server.js` like so:

```js
cds.db = await cds.connect.to('db')
```

[Learn more about bootstrapping in `cds.server`.](./cds-serve){.learn-more}



## Methods



### cds. error() {.method}

```ts
function cds.error (
  status?  : number  
  message  : string | object,
  details? : object
  caller?  : function
)
```

This is a helper to construct new errors in various ways:

```js
let e = new cds.error ('message')
let e = new cds.error ('message', { code, ... })
let e = new cds.error ({ message, code, ... })
```

If called without `new`  the error is thrown immediately allowing code like that:

```js
let e = foo || cds.error (`Expected 'foo' to be truthy, but got: ${foo}`)
```

You can also use `cds.error` with tagged template strings:

```js
let e = foo || cds.error `Expected 'foo' to be truthy, but got: ${foo}`
```

> In contrast to basic template strings, passed in objects are added using Node's  `util.format()` instead of `toString()`.

Method `cds.error.expected` allows to conveniently construct error messages as above:

```js
let e = foo || cds.error.expected `${{foo}} to be truthy`
```

Optional argument `caller` can be a calling function to truncate the error stack. Default is `cds.error` itself, so it will never show up in the stacks.





### cds. exit() {.method}

Provides a graceful shutdown for running servers, by first emitting `cds.emit('shutdown')` with handlers allowed to be `async` functions. If not running in a server, it calls `process.exit()`

```js
cds.on('shutdown', async()=> fs.promises.rm('some-file.json'))
cds.on('shutdown', ()=> console.log('shutdown'))
cds.exit() //> will rune above handlers before stopping the server
```




## Lifecycle Events

The `cds` facade object is an [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
which frameworks emits events to, during the server bootstrapping process, or when we compile models.
You can register event handlers using `cds.on()` like so:


```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('bootstrap', ...)
cds.on('served', ...)
cds.on('listening', ...)
```

- [Learn more about Lifecycle Events emitted by `cds.compile`](cds-compile#lifecycle-events) {.learn-more}
- [Learn more about Lifecycle Events emitted by `cds.server`](cds-server#lifecycle-events) {.learn-more}


> [!warning]
> As we're using Node's standard [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
> event handlers execute **synchronously** in the order they are registered, with `served` and `shutdown`
> events as the only exceptions.



-----
