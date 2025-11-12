# Use the OpenAPI Generator to Generate Typed Clients

REST is a common pattern to define APIs of services. Many SAP systems like SAP S/4HANA, SAP Concur and SAP Business Technology Platform provide their services through REST APIs. A common way to specify these services are OpenAPI specifications.

With the SAP Cloud SDK, you can generate typed clients for those specifications.

Check this guide for downloading a specification from SAP Business Accelerator Hub.

## Installation

Run the command below to install the OpenAPI generator as a devDependency:

```bash
npm install -D @sap-cloud-sdk/openapi-generator
```

## Generate a Client Using the Command Line Interface

The SAP Cloud SDK generator is primarily intended to be used on the command line. You can generate an OpenAPI client by running:

```bash
npx openapi-generator --input <input> --outputDir <outputDirectory>
```

The `<input>` points to your specification file or a directory containing the specification(s) and `<outputDirectory>` to the target folder where the generated client(s) will be saved.

An `options-per-service.json` file is created using the `--optionsPerService` option.

- When set to a directory path, an `options-per-service.json` file is read from or created in the given directory.
- When set to a file path, the file is read or created with the given name.

This file is used for customizing subdirectory naming and contains a mapping from the original file name to the following information:

- `directoryName`: the name of the subdirectory the client code will be generated into.
- `packageName`: the name of the npm package, if a `package.json` file is generated. This information is optional.
- `basePath`: the URL path to be prepended to the API path before every request.

This information can be adjusted manually and ensures that every run of the generator produces the same names for the generation.

Example:

```json
{
  "path/to/your/service-specifications/MyService.yaml": {
    "directoryName": "my-service",
    "basePath": "/base/path/to/service",
    "packageName": "my-service"
  }
}
```

By default, the generated clients will each contain:

- API files as `.ts` files - one for each "API" in the service. See details.
- A schema directory, containing schema files (`.ts`), one for each schema defined in the service specification.
- All of the above as transpiled sources, including JavaScript sources (`.js`), type definition files (`.d.ts`) and sourcemap files (`.js.map`).
- A `package.json`.
- A `tsconfig.json`.

The generation always includes the TypeScript sources. All other files can be excluded from the generation - see the options below.

> **note**
> The generator should be installed as a local dependency, because global installations hide the used generator version and cause problems when transpiling to JavaScript. If you must use a globally installed generator, install the `@types/node` and `@sap-cloud-sdk/openapi` package in your project to make the transpilation work. If you need to transpile sources without any local node_modules, you must manually execute the tsc compiler on your own with a custom path mapping. See transpile for more details in the options below.

## Options

Run `openapi-generator --help` for additional options.

| Option | Default | Description |
|-------|---------|-------------|
| `-i,--input` (required) | - | Specify the path to the directory or file containing the OpenAPI service definition(s) to generate clients for. Accepts Swagger and OpenAPI definitions as YAML and JSON files. Throws an error if the path does not exist. |
| `-o,--outputDir` (required) | - | Specify the path to the directory to generate the client(s) in. Each client is generated into a subdirectory within the given output directory. Creates the directory if it does not exist. Customize subdirectory naming through `--optionsPerService`. |
| `--optionsPerService` | - | Set the path to a file containing the options per service. The configuration allows to set a `directoryName` and `packageName` for every service, identified by the path to the original file. It also makes sure that names do not change between generator runs. If a directory is passed, an `options-per-service.json` file is read/created in this directory. |
| `--overwrite` | `false` | Allow overwriting files, that already exist. This is useful, when running the generation regularly. |
| `--clearOutputDir` | `false` | Remove all files in the output directory before generation. Be cautious when using this option, as it really removes EVERYTHING in the output directory. |
| `--packageJson` | `false` | When enabled, a `package.json`, that specifies dependencies and scripts for transpilation and documentation generation is generated. |
| `--include` | `''` | Include files matching the given glob into the root of each generated client directory. |
| `-t, --transpile,` | `false` | Transpile the generated TypeScript code. When enabled a default `tsconfig.json` will be generated and used. It emits `.js`, `.js.map` and `.d.ts` files. To configure transpilation set `--tsconfig`. |
| `--tsconfig` | `default tsconfig` | Replace the default `tsconfig.json` by passing a path to a custom configuration. By default, a `tsconfig.json` is only generated when transpilation is enabled (`--transpile`). If a directory is passed, a `tsconfig.json` file is read from this directory. |
| `-p, --prettierConfig` | `default prettier config` | Configuration file for prettier if you want to change the default value. |
| `--verbose` | `false` | Turn on verbose logging. |
| `--skipValidation` | `false` | By default, the generation fails, when there are duplicate or invalid names for operations and/or path parameters after transforming them to camel case. Set this to `true` to enable unique and valid name generation. The names will then be generated by appending numbers and prepending prefixes. |
| `-c, --config` | - | Set the path to the file containing the options for generation. If other flags are used, they overwrite the options set in the configuration file. If a directory is passed, a `config.json` file is read from this directory. |
| `--generateESM` | `false` | Generate ESM compatible code. |

## Generate a Client Programmatically

The generator can also be executed programmatically in JavaScript or TypeScript code. Add the `@sap-cloud-sdk/openapi-generator` package to your project:

```bash
npm i @sap-cloud-sdk/openapi-generator
```

This package exports the `generate()` function. It takes the same options as the command-line tool and generates the same files:

```typescript
import { generate } from '@sap-cloud-sdk/openapi-generator'

const generatorOptions = {
  input: 'directoryWithOpenApiFiles';
  outputDir: 'myOutputDirectory';
}

await generate(generatorOptions);
```

## How the API Code is Generated

By default, the generator produces one service directory for every OpenAPI specification. The directory name is based on the file name of the specification and is transformed to kebab case, e.g. `my-service`.

### APIs

All operations of the service are grouped into APIs based on their tags. A service can consist of multiple APIs. If multiple tags are specified for an operation, only the first one is considered. If no tags are specified, "default" is used.

The API names are transformed by appending "Api" and transforming them to pascal case, e.g. 'my-tag' results in `MyTagApi`. In case the tag already ends with "api" (case independent), one "Api" will be removed, e.g. `myapi` results in `MyApi`. If your tags end with "api", but this is part of the word, e.g. "okapi", you can use the OpenAPI vendor extensions and provide an explicit API name ending with "Api", e.g. "OkapiApi". Note, that operations are grouped into APIs based on their transformed names, not the original names. Therefore, tags like "my-tag" and "MyTag" are treated as the same API, "MyTagApi".

### Operations

Every operation in the specification is reflected as a function of a generated API. The function names are based on the `operationId` property in the specification of the operation. If no `operationId` is given, the name is derived from the method and the path pattern, examples:

- 'resource' with POST would result in `createResource`
- 'resource/{id}' with GET would result in `getResourceById`

The function names are transformed to camel case, e.g. 'myFunction'. Duplicates within an API are handled by adding an index at the end of the name. In cases where there are duplicate names, but one of the names is in camel case, this name remains as is. Example:

| Original operationIds | Generated function names |
|----------------------|-------------------------|
| my-function | myFunction2 |
| myFunction | myFunction |
| other_function | otherFunction |

## Configure Generated Client Structure and Naming

In case you need more flexibility when generating clients, you can use the SAP Cloud SDK's vendor extensions for OpenAPI. The SAP Cloud SDK provides two extensions:

- `x-sap-cloud-sdk-api-name` to configure the structure and naming of the generated APIs.
- `x-sap-cloud-sdk-operation-name` to configure the generated function names.

You can set those on different levels of the specification. They take precedence before the default behavior.

### x-sap-cloud-sdk-api-name

Use this extension to configure the structure of your generated APIs. Setting `x-sap-cloud-sdk-api-name` as a property determines which operations are grouped into one API. Note, that the name will be transformed to pascal case with an "Api" ending, same as in the default behavior, e.g. "MyApi". When referring to the "API name", the transformed name is meant.

This extension can be set on the following levels:

- Operations: operations that have the same API name are grouped into one API
- On the path definitions: all operations below paths with the same API name are grouped into one API
- Root of the specification: all operations in the specification belong to the specified API

This extension can be set on all these levels in the same document. In these cases the most specific use of the extension takes precedence.

### x-sap-cloud-sdk-operation-name

Use this extension to overwrite the default names for the generated functions. As of the OpenAPI specification, this is the intent of the `operationId` field. However, the value of this property has to be unique throughout a specification file. Many OpenAPI validators fail if there are duplicate operationIds. With the approach of the SAP Cloud SDK OpenAPI generator this restriction might make the resulting clients more complicated than necessary. Given that you have multiple APIs, it can make sense to have the same function names in different APIs, e.g. `MyResource1Api.getAll()` and `MyResource2Api.getAll()`. The purpose of the `x-sap-cloud-sdk-operation-name` is to allow using duplicate names across APIs, while complying with the OpenAPI specification.

## npm Packages vs. Local clients

The SAP Cloud SDK OpenAPI client generator generates TypeScript code. By default, it creates only the TypeScript sources.

If you want to use the generated client in your TypeScript code without sharing it, you can work with the default configuration. If you work with JavaScript, you can enable and configure transpilation with the `--transpile` and `--tsconfig` flags.

If you want to publish a generated client to an npm registry, in addition to transpiling, you will need a `package.json` file for the client. You can generate it with the `--packageJson` flag or include a custom `package.json` with the `--include` flag. Make sure to check intellectual property regulations before publishing to a public registry.

The generated clients depend on the `@sap-cloud-sdk/openapi` package. You have to make sure there is a local reference to this package by running:

```bash
npm install @sap-cloud-sdk/openapi
```

## Transpilation

If you installed the generator globally and want to transpile the generated code, you have to install the required dependency (or devDependency) for your client (`sap-cloud-sdk/openapi`) prior to generation. You do this by running:

```bash
npm install -D @sap-cloud-sdk/openapi
```

If you installed the generator as a devDependency, transpilation will work without additional steps.

## Prettier

Since version 2.11.0, the SAP Cloud SDK runs prettier on the generated sources using a default prettier config. The prettier formats only TypeScript files (`.ts` and `.d.ts`) to avoid broken source maps. If you are not happy with the configuration, you can provide a custom configuration using the `--prettierConfig` command line argument. Note that this formatting is done in-memory before the generator emits the files, so no expensive additional I/O is required. Alternatively, you can execute a custom formatting step after the generation is finished.

Note that custom formatting steps could break source maps when you generate a JavaScript client (option `--transpile` enabled). JavaScript clients should be excluded from formatting because the generated `.js` and `.map.js` files are not meant for humans to read.

## Execute a Request Using a Generated OpenAPI Client

The usage of the OpenAPI clients is similar to the clients for OData. The OpenAPI clients consist of at least one API, which in turn has at least one function. What APIs and functions are available in a client depends on the service specification.

### Executing a Request

The request execution always follows the same structure. You invoke a function of an API, optionally configure your request and then execute it against a destination:

```typescript
const responseData = await MyApi.myFunction().execute(destination);
```

In the example above you invoke the function `myFunction()` of the API `MyApi` without further configuration and execute it against a destination named `destination`. The `execute()` method returns the response data directly as a Promise, if available. Responses without response body, result in the return type `Promise<void>`.

You can configure your request by setting custom headers, a custom request configuration or disabling CSRF token fetching. If you need more information than the response data, you can also get the raw response.

### Passing Parameters

Often, resources are accessible under paths that require path parameters and/or query parameters and write requests often send a request body to modify resources. The clients generated by the SAP Cloud SDK OpenAPI generator require you to set the parameters that are mandatory and allow you to set those that are optional.

#### Path Parameters

Path parameters are always mandatory. If path parameters are present in the path pattern for a request, e.g. '/my-resource/{resourceId}', those are the first mandatory arguments in the generated function, e.g. `MyApi.getMyResource(resourceId)`. The types of the arguments depend on the specification. Their names are always camel case and the order is determined by their occurrence in the path pattern.

#### Query Parameters

Query parameters can be both mandatory and optional. Query parameters are provided as an object, e.g. if you can set a limit parameter, `MyApi.getMyResource(resourceId, { limit: 10 })`. The types of the parameters depend on the specification. By default, the parameter names and values are URI encoded. Their names are as specified in the original OpenAPI document.

#### Header Parameters

Header parameters can be both mandatory and optional. If header parameters for a certain API function exist, they are always the last argument of the function. Header parameters are also provided as an object, e.g. extending the example above, `MyApi.getMyResource(resourceId, { limit: 10 }, { Authorization: 'my-auth-key' })`. The types of the parameters depend on the specification.

> **info**
> If there are optional query parameters and required header parameters in the spec, you must pass an empty object for the query parameters if you do not intend to provide any. This is because optional parameters cannot precede required parameters. For example: `MyApi.getMyResource(resourceId, {}, { Authorization: 'my-auth-key' })`.

#### Request Bodies

Request bodies can be both mandatory and optional. The according function argument is always `body` and it is always between the path and query parameters, e.g. when the body is a simple object containing a title, `MyApi.updateMyResource(resourceId, { title: 'My Title' }, { lang: 'en' })`. If the request body is optional, you have to pass `undefined`, e.g. `MyApi.updateMyResource(resourceId, undefined, { lang: 'en' })`.

### Setting Custom Headers

The SAP Cloud SDK sets all mandatory headers by default. To set additional headers or change the default values used in the headers, use the `addCustomHeaders()` method. You can pass an object, where the key is the name of the header and the value, well the value.

```typescript
MyApi.myFunction()
  .addCustomHeaders({
    apikey: 'my-api-key'
  })
  .execute(destination);
```

Custom headers take precedence over default headers. The example above can be used to execute requests against the sandbox systems of the SAP Business Accelerator Hub.

### Setting a Custom Request Configuration

By default, the SAP Cloud SDK uses axios as an HTTP client for executing requests. The SAP Cloud SDK derives and configures most request options including url, headers, etc. You can provide a custom request configuration to pass additional options to axios. The example below demonstrates how to configure the response data type, typically used when downloading a file from an endpoint.

```typescript
MyEntity.requestBuilder()
  .getAll()
  .addCustomRequestConfiguration({ responseType: 'arraybuffer' });
```

> **note**
> To ensure API consistency, the SAP Cloud SDK does not allow overriding the following options:
> - url
> - baseURL
> - data
> - headers
> - params

### Setting a Custom Service Path

A custom service path can be manually set in the `options-per-service.json` by providing a `basePath` property during client generation. It can also be adjusted per request by using the `setBasePath()` method:

```typescript
MyApi.myFunction().setBasePath('/base/path/to/service').execute(destination);
```

This will change the base path of the request. Executing the example request above against a destination with the URL `https://my.some-system.com` will result in a request against the target like this: `https://my.some-system.com/base/path/to/service/myFunctionPath`, where `/myFunctionPath` is the API path parameter.

### Setting Middlewares

You can specify middlewares for a request via the `middleware()` method on the request builder:

```typescript
MyApi.myFunction().middleware(myMiddlewares).execute(destination);
```

The method accepts variable number of single elements as well as arrays. Middleware is a general concept used to add arbitrary enhancements to the request. A typical use case is to also add resilience to requests.

### Getting a Raw Response

In addition to the `execute()` method, you can execute a request using the `executeRaw()` method. It returns an `HttpResponse` instance, which contains the following properties:

- `status`: the status code of the response
- `headers`: the response headers
- `data`: the response body
- `request`: the original request

Example:

```typescript
const httpResponse: HttpResponse = MyEntity.requestBuilder()
  .getAll()
  .executeRaw(destination);
```

Typical cases, where you might need to use the `executeRaw()` method are:

- You need additional information about the response, like the status code or response headers.
- You need additional information about the request, like payload, method, or request headers.
- The `execute()` method is omitted in some request builders because the response data cannot be deserialized by the request builder.
- Debugging purposes.

### Handling of Cross-Site Request Forgery Tokens

To create, update, and delete requests the SAP Cloud SDK will try to send a CSRF token. Upon execution, the request will try to fetch a token first before issuing the create request. Many services require this behavior for security reasons. However, the create request will be made without a CSRF token if none could be obtained.

#### Skip CSRF Token Handling

For some services, the CSRF token is not required even for non-GET requests. Therefore, skipping to fetch the CSRF token makes sense as a performance improvement. You can disable the CSRF token request by using the `skipCsrfTokenFetching()` method like below:

```typescript
const responseData = await MyApi.myFunction()
  .skipCsrfTokenFetching()
  .execute(destination);
```

#### Custom CSRF Token Handling

If you need to adjust the way CSRF tokens are fetched, you can do so by using middlewares:

1. Disable the token fetching to deactivate the default code.
2. Add a middleware to include your custom token fetching.

The SAP Cloud SDK offers a csrf middleware which allows to configure some basic options:

- `method` The HTTP method used to get a token
- `URL` The URL which is called to retrieve a token
- `middleware` Middlewares used for the token retrieval request

```typescript
const responseData = await MyApi.myFunction()
  .skipCsrfTokenFetching()
  .middleware([csrf({ url: 'https://example.com/csrf/token/url' })])
  .execute(destination);
```

