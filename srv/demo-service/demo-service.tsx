import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import { initialTransition, type SnapshotFrom } from "xstate";

import type {
  AuthorizationDetailRequest,
  AuthorizationDetail,
} from "#cds-models/sap/scai/grants";
import permissionsElevationMachine, {
  PermissionsContext,
} from "./permissions-elevation-machine.tsx";
import { createActor } from "xstate";
import { htmlTemplate } from "../middleware/htmx.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";

import React from "react";

interface AuthorizationRequestButtonProps {
  client_id?: string;
  redirect_uri?: string;
  scope?: string | null;
  requested_actor?: string;
  request_uri?: string;
  expires_in?: number;
  authorization_details?: PermissionsContext["request"]["authorization_details"];
  authServerUrl?: string;
}

function AuthorizationRequestButton({
  authServerUrl,
  request_uri,
  expires_in,
  authorization_details,
  client_id,
  redirect_uri,
  scope,
  requested_actor,
  ...request
}: AuthorizationRequestButtonProps) {
  return (
    <div hx-ext="client-side-templates">
      <div className="space-y-3">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Endpoint</div>
          <div className="text-sm text-purple-400 font-mono">
            GET /authorize
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Parameters</div>
          <div className="text-sm text-white">
            client_id: {client_id}
            <br />
            request_uri: {request_uri}
            <br />
          </div>
        </div>
      </div>
      <form action={`${authServerUrl}/authorize`} method="post">
        <input type="hidden" name="client_id" value="demo-client-app" />
        <input type="hidden" name="request_uri" value={request_uri!} />
        <button
          type="submit"
          className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          🔗 Authorize Request
        </button>
      </form>
      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-gray-400 text-sm text-center text-pretty ">
            The server pushed an authorization request to the authorization
            server and received `request_uri` to use in the authorization
            request
          </div>
          <div className="text-gray-500 text-sm text-center text-pretty font-mono ">
            Endpoint: {`${authServerUrl}/par`}
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Endpoint</div>
            <div className="text-sm text-purple-400 font-mono">POST /par</div>
          </div>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
          <div className="space-y-2 text-xs font-mono overflow-y-auto scroll-smooth mx-auto">
            <pre className="text-gray-300 text-pretty whitespace-pre-wrap">
              {JSON.stringify(
                {
                  client_id,
                  redirect_uri,
                  requested_actor,
                  ...request,
                  scope,
                  authorization_details,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuthorizationParamsProps {
  client_id?: string;
  redirect_uri?: string;
  scope?: string | null;
  requested_actor?: string;
  authorization_details?: AuthorizationDetailRequest;
  grant_id?: string;
}

function AuthorizationParams({
  authorization_details,
  client_id,
  redirect_uri,
  scope,
  requested_actor,
}: AuthorizationParamsProps) {
  return (
    <div className="space-y-6">
      {/* Request Parameters */}
      <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
        <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center space-x-2">
          <span>📋</span>
          <span>Request Parameters</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-400 block mb-1">
                Client Application
              </span>
              <span className="text-blue-400 font-medium">demo-client-app</span>
            </div>
            <div>
              <span className="text-sm text-gray-400 block mb-1">
                Requesting Actor
              </span>
              <span className="text-purple-400 font-mono text-sm">
                {requested_actor}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-400 block mb-1">
                Requested Scope
              </span>
              <span className="text-white">{scope || "openid"}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400 block mb-1">
                Resource Types
              </span>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(authorization_details) ? (
                  [
                    ...new Set(
                      authorization_details.map((detail) => detail.type)
                    ),
                  ].map((type, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30"
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-white text-sm">
                    {JSON.stringify(authorization_details, null, 2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authorization Details */}
      <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
        <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center space-x-2">
          <span>🔐</span>
          <span>Access Permissions</span>
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.isArray(authorization_details)
            ? (() => {
                // Group authorization details by type
                const grouped = authorization_details.reduce(
                  (acc, detail) => {
                    const detailType = detail.type;
                    if (detailType && !acc[detailType]) acc[detailType] = [];
                    if (detailType) acc[detailType].push(detail);
                    return acc;
                  },
                  {} as Record<string, AuthorizationDetailRequest[]>
                ) as Record<string, (AuthorizationDetailRequest & any)[]>;

                return Object.entries(grouped).map(([type, details]) => (
                  <div
                    key={type}
                    className="bg-gray-600/30 rounded-xl p-5 border border-gray-500/50 h-fit"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-xl">
                          {type === "mcp"
                            ? "🔧"
                            : type === "api"
                              ? "🌐"
                              : type === "fs"
                                ? "📁"
                                : type === "database"
                                  ? "🗄️"
                                  : "⚙️"}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-white font-semibold capitalize">
                          {type} Access
                        </h5>
                        <p className="text-xs text-gray-400">
                          {details.length}{" "}
                          {details.length === 1 ? "permission" : "permissions"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {details.map((detail, index: number) => (
                        <div
                          key={index}
                          className="bg-gray-700/40 rounded-lg p-4 border-l-4 border-blue-400/60"
                        >
                          {type === "mcp" && (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="text-sm text-gray-400">
                                  Server:
                                </span>
                                <span className="text-purple-400 font-mono">
                                  {detail.server}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-blue-400 text-sm">
                                  {detail.transport}
                                </span>
                              </div>
                              {detail.tools && (
                                <div>
                                  <span className="text-sm text-gray-400 block mb-2">
                                    Available Tools:
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.keys(detail.tools).map(
                                      (tool, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30"
                                        >
                                          {tool}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              {detail.locations &&
                                detail.locations.length > 0 && (
                                  <div>
                                    <span className="text-sm text-gray-400 block mb-2">
                                      Locations:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {detail.locations.map(
                                        (location: string, i: number) => (
                                          <span
                                            key={i}
                                            className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30"
                                          >
                                            {location}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {type === "api" && (
                            <div className="space-y-2">
                              {detail.urls && (
                                <div>
                                  <span className="text-sm text-gray-400 block mb-2">
                                    API Endpoints:
                                  </span>
                                  <div className="space-y-2">
                                    {detail.urls.map(
                                      (url: string, i: number) => (
                                        <div
                                          key={i}
                                          className="text-blue-300 text-sm font-mono bg-gray-800/50 rounded-lg px-3 py-2 border border-blue-500/20"
                                        >
                                          {url}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              {detail.protocols && (
                                <div>
                                  <span className="text-sm text-gray-400 block mb-2">
                                    Protocols:
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {detail.protocols.map(
                                      (protocol: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30"
                                        >
                                          {protocol}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {type === "fs" && (
                            <div className="space-y-2">
                              {detail.roots && (
                                <div>
                                  <span className="text-sm text-gray-400 block mb-2">
                                    Root Directories:
                                  </span>
                                  <div className="space-y-2">
                                    {detail.roots.map(
                                      (root: string, i: number) => (
                                        <div
                                          key={i}
                                          className="text-yellow-300 text-sm font-mono bg-gray-800/50 rounded-lg px-3 py-2 border border-yellow-500/20"
                                        >
                                          {root}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              <div>
                                <span className="text-sm text-gray-400 block mb-2">
                                  File Permissions:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {detail.permissions_read && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30">
                                      read
                                    </span>
                                  )}
                                  {detail.permissions_write && (
                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded border border-yellow-500/30">
                                      write
                                    </span>
                                  )}
                                  {detail.permissions_execute && (
                                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/30">
                                      execute
                                    </span>
                                  )}
                                  {detail.permissions_list && (
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">
                                      list
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()
            : null}
        </div>
      </div>
    </div>
  );
}

const actorState = new Map<
  string,
  SnapshotFrom<typeof permissionsElevationMachine>
>();

function createPermissionsElevationActor(id: string) {
  const actor = createActor(permissionsElevationMachine, {
    id: id,
    input: {
      actor: "urn:agent:analytics-bot-v1",
    },
    // snapshot: await this.read(this.entities.DemoState, req.data.sid),
    snapshot: actorState.get(id),
  });

  actor.start();
  const subscribtion = actor.subscribe(() => {
    // this.upsert({snapshot: actor.getPersistedSnapshot(), sid: req.data.sid}).into(this.entities.DemoState)
    actorState.set(
      id,
      actor.getPersistedSnapshot() as SnapshotFrom<
        typeof permissionsElevationMachine
      >
    );
  });

  return { actor, subscribtion, snapshot: actor.getSnapshot() };
}

export default class Service extends cds.ApplicationService {
  public async main() {
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    cds.context?.http?.res.send(
      renderToString(
        <div className="min-h-screen bg-gray-950 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              {/* Progress Steps */}
              <div
                className="flex justify-center mb-8"
                id="navbar"
                hx-get="/demo/navbar"
                hx-trigger="load"
                hx-swap="innerHTML"
              >
                {/* <div  hx-get="/demo/navbar" hx-trigger="load" hx-swap="outerHTML" /> */}
              </div>

              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                  <iframe
                    id="authorization-iframe"
                    name="authorization-iframe"
                    className="w-full h-full min-h-screen"
                    title="Authorization Screen"
                    src="/demo/request"
                    aria-label="Interactive consent screen for authorization"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    );
  }

  public async navbar(grant_id, event) {
    console.log("navbar", grant_id);
    const { actor, snapshot } = grant_id
      ? createPermissionsElevationActor(grant_id)
      : {
          actor: null,
          snapshot: initialTransition(permissionsElevationMachine)[0],
        };

    const state = snapshot.value;

    // Get meta information for all states
    const idleMeta = permissionsElevationMachine.states.idle.meta?.next;
    const analysisMeta =
      permissionsElevationMachine.states.analysis_granted.meta?.next;
    const deploymentMeta =
      permissionsElevationMachine.states.deployment_granted.meta?.next;

    console.log("state", state, "idleMeta", idleMeta);
    event = event || "grant-updated";
    const activeClass =
      event === "grant-requested"
        ? "bg-blue-600 animate-pulse  animate-infinite animate-duration-1000 animate-ease-linear "
        : "bg-blue-500";
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    cds.context?.http?.res.send(
      renderToString(
        <div
          hx-get="/demo/navbar"
          hx-trigger="grant-updated from:body, grant-requested from:body"
          hx-swap="outerHTML"
        >
          <form
            className="flex items-center space-x-4"
            action={`/demo/elevate?grant_id=${grant_id}`}
            method="get"
            target="authorization-iframe"
          >
            <input type="hidden" name="grant_id" value={grant_id} />
            <div className="flex items-center space-x-2">
              <div
                className={` w-8 h-8  rounded-full flex items-center justify-center text-white font-bold text-sm
            ${
              state === "idle"
                ? activeClass
                : state === "subscription_granted"
                  ? "bg-blue-400"
                  : "bg-blue-900"
            }`}
                hx-get={`/demo/elevate?grant_id=${grant_id}`}
              >
                1
              </div>
              <span
                className={`text-sm ${state === "analysis_granted" ? "text-blue-400" : "text-gray-400"}`}
              >
                {state === "idle" ? idleMeta?.active : idleMeta?.permitted}
              </span>
            </div>
            <div className="w-12 h-px bg-gray-600"></div>
            <div className=" flex items-center space-x-2">
              <button
                type="submit"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  state === "analysis_granted"
                    ? activeClass
                    : state === "deployment_granted"
                      ? "bg-blue-900"
                      : state === "subscription_granted"
                        ? "bg-blue-400"
                        : "bg-gray-600"
                }  `}
              >
                2
              </button>
              <span
                className={`text-sm ${state === "deployment_granted" ? "text-blue-400" : "text-gray-400"}`}
              >
                {state === "analysis_granted"
                  ? analysisMeta?.active
                  : state === "deployment_granted"
                    ? analysisMeta?.permitted
                    : state === "subscription_granted"
                      ? analysisMeta?.permitted
                      : analysisMeta?.pending || "Deployment"}
              </span>
            </div>
            <div className="w-12 h-px bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  state === "deployment_granted"
                    ? activeClass
                    : state === "subscription_granted"
                      ? "bg-blue-400"
                      : "bg-gray-600"
                }  `}
              >
                3
              </button>
              <span
                className={`text-sm ${state === "subscription_granted" ? "text-blue-400" : "text-gray-400"}`}
              >
                {state === "deployment_granted"
                  ? deploymentMeta?.active
                  : state === "subscription_granted"
                    ? deploymentMeta?.permitted
                    : deploymentMeta?.pending || "Subscription Management"}
              </span>
            </div>
          </form>
        </div>
      )
    );
  }

  public async index() {
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    cds.context?.http?.res.send(
      htmlTemplate(
        renderToString(
          <body
            className="bg-gray-950 text-white min-h-screen"
            hx-ext="client-side-templates"
          >
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  🔐 OAuth Grant Management Demo
                </h1>
                <p className="text-gray-400 text-lg mb-6">
                  Progressive agent authorization: Analysis → Deployment →
                  Subscription Management
                </p>
              </div>
              <div id="content">
                <div
                  id="main"
                  hx-get="/demo/main"
                  hx-swap="innerHTML"
                  hx-trigger="load"
                ></div>
              </div>
            </div>
            <script src="/demo/event_handlers"></script>
          </body>
        )
      )
    );
  }

  public async request() {
    try {
      console.log("🔍 Demo Request - Starting request processing");
      console.log(
        "🔍 Demo Request - HTTP method:",
        cds.context?.http?.req.method
      );
      console.log("🔍 Demo Request - Headers:", cds.context?.http?.req.headers);
      console.log("🔍 Demo Request - User:", cds.context?.user);

      const [
        {
          context: { request: config },
        },
      ] = initialTransition(permissionsElevationMachine);

      console.log("🔍 Demo Request - Config from state machine:", config);

      const authorizationService = await cds.connect.to(AuthorizationService);
      console.log(
        "🔍 Demo Request - Connected to AuthorizeService",
        (cds.context?.user as any)?.authInfo
      );

      const request = {
        response_type: "code",
        client_id: "demo-client-app",
        redirect_uri: new URL(
          "/demo/callback",
          cds.context?.http?.req.headers.referer
        ).href,
        grant_management_action: "create",
        authorization_details: JSON.stringify(config.authorization_details),
        requested_actor: "urn:agent:analytics-bot-v1",
        scope: config.scope,
        subject: cds.context?.user?.id,
        subject_token_type: "urn:ietf:params:oauth:token-type:basic",
      };

      console.log(
        "🔍 Demo Request - PAR request data:",
        JSON.stringify(request, null, 2)
      );
      console.log("🔍 Demo Request - Calling authorizationService.par...");

      const response = await authorizationService.par(request);

      console.log("🔍 Demo Request - PAR response:", response);

      if (!response) {
        console.log("❌ Demo Request - No response from PAR");
        return await cds.context?.http?.res.send(
          renderToString(
            <div>
              <h1>Authorization failed</h1>
            </div>
          )
        );
      }

      console.log("🔍 Demo Request - Preparing HTML response");
      const authServerUrl =
        (await cds.connect.to(AuthorizationService).then((service: any) => {
          return service.baseUrl;
        })) || "/oauth-server";

      console.log("🔍 Demo Request - Auth server URL:", authServerUrl);
      cds.context?.http?.res.setHeader("Content-Type", "text/html");
      const htmlResponse = htmlTemplate(`${renderToString(
        <AuthorizationRequestButton
          authServerUrl={authServerUrl}
          {...request}
          request_uri={response.request_uri!}
          expires_in={response.expires_in!}
          authorization_details={config.authorization_details}
        />
      )}
     
      `);

      console.log("✅ Demo Request - Sending HTML response");
      return await cds.context?.http?.res.send(htmlResponse);
    } catch (e) {
      const error = e as {
        message: string;
        code: string;
        target: string;
        args: string[];
        stack: string;
      };
      console.error("❌ Demo Request - Error occurred:", error);
      console.error("❌ Demo Request - Error stack:", error.stack);
      console.error("❌ Demo Request - Error details:", {
        message: error.message,
        code: error.code,
        target: error.target,
        args: error.args,
      });

      // Return error response
      return await cds.context?.http?.res.status(500).send(
        renderToString(
          <div>
            <h1>Internal Server Error</h1>
            <p>Error: {error.message}</p>
          </div>
        )
      );
    }
  }

  public async callback(code, code_verifier, redirect_uri) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const tokenResponse: any = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "demo-client-app",
      code: code,
      code_verifier: code_verifier,
      redirect_uri: redirect_uri,
    });
    const { access_token, token_type, expires_in, grant_id, error, ...rest } =
      tokenResponse;

    if (error) {
      return await cds.context?.http?.res.send(
        renderToString(
          <div>
            <div>Authorization failed: {error}</div>
            <script
              async
              defer
              src="/demo/send_event?grant_id=${grant_id}&type=grant-failed"
            ></script>
          </div>
        )
      );
    }
    const { actor } = createPermissionsElevationActor(grant_id);

    actor.send({
      type: "GRANT_UPDATED",
      access_token,
      token_type,
      expires_in,
      grant_id,
      ...rest,
    });

    // const grant_details = await (
    //   await cds.connect.to(AuthorizationService)
    // ).get("Grants", grant_id);
    // console.log(grant_details);
    cds.context?.http?.res.setHeader("HX-Trigger", "grant-updated");
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return await cds.context?.http?.res?.send(`<body>${renderToString(
      <div>
        {/* <a
            href={`/demo/elevate?grant_id=${grant_id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto float-right justify-end"
          >
            Elevate Permissions
          </a> */}
        {/* Full Width Layout */}
        <div className="space-y-6">
          {/* Authorization Details - Full Width */}
          <AuthorizationParams
            authorization_details={(rest as any).authorization_details}
            client_id={(rest as any).client_id}
            redirect_uri={(rest as any).redirect_uri}
            scope={rest.scope}
            requested_actor={rest.actor || (rest as any).requested_actor}
            grant_id={grant_id}
          />

          {/* JSON Response - Full Width */}
          <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-300">
                🔐 Token Response
              </h3>
              <span className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
                JSON
              </span>
            </div>
            <div className="text-sm font-mono overflow-y-auto scroll-smooth max-h-96 bg-gray-800/50 rounded-lg p-4">
              <pre className="text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    access_token,
                    token_type,
                    expires_in,
                    grant_id,
                    ...rest,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )} <script async defer src="/demo/send_event?grant_id=${grant_id}&type=grant-requested">
      </script></body>
     `);
  }

  public async event_handlers(req) {
    cds.context?.http?.res.setHeader("Content-Type", "text/javascript");
    cds.context?.http?.res.send(`
      document.body.addEventListener('htmx:configRequest', function (evt) {
        if (evt.detail.triggeringEvent && evt.detail.triggeringEvent.type.startsWith('grant-')) {
          console.log('grant-', evt.detail.triggeringEvent.type);
          const detail = evt.detail.triggeringEvent.detail;
          evt.detail.parameters = { ...evt.detail.parameters, ...detail };
        }
      });
    `);
  }

  public async send_event(grant_id, type) {
    cds.context?.http?.res.setHeader("Content-Type", "text/javascript");
    cds.context?.http?.res.send(`
      
        sendToParent();
        document.onload = function() {
            console.log('onload');
          sendToParent();
        };
        function sendToParent() {
            console.log('sendToParent');
            const event = new CustomEvent('${type || "grant-updated"}', {
               bubbles: true,
               detail: ${JSON.stringify({ grant_id: grant_id, event: type })} ,
            });
            if(window.parent) {
              window.parent.document.body.dispatchEvent(event);
            }
            else {
              window.document.body.dispatchEvent(event);
            }

          }
      `);
  }

  public async elevate(grant_id) {
    const { actor } = createPermissionsElevationActor(grant_id);
    const config = actor.getSnapshot().context.request;
    const authorizationService = await cds.connect.to(AuthorizationService);
    const request = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: new URL(
        "/demo/callback",
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: "merge",
      grant_id: grant_id,
      authorization_details: JSON.stringify(config.authorization_details),
      requested_actor: "urn:agent:accounting-bot-v1",
      scope: config.scope,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject: cds.context?.user?.id,
    };
    const response = await authorizationService.par(request);

    if (!response) {
      return await cds.context?.http?.res.send(
        renderToString(<div>Authorization failed</div>)
      );
    }
    const { request_uri, expires_in } = response;
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    cds.context?.http?.res.setHeader("HX-Trigger", "grant-updated");
    const authServerUrl =
      (await cds.connect.to(AuthorizationService).then((service: any) => {
        return service.baseUrl;
      })) || "/oauth-server";
    cds.context?.http?.res.send(
      htmlTemplate(`
            ${renderToString(
              <AuthorizationRequestButton
                authServerUrl={authServerUrl}
                {...request}
                request_uri={request_uri!}
                expires_in={expires_in!}
                authorization_details={config.authorization_details}
              />
            )},
            <script async defer src="/demo/send_event?grant_id=${grant_id}&type=grant-updated">
            </script>
          `)
    );
  }
}

export type DemoService = Service & typeof cds.ApplicationService;
