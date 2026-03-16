import cds from "@sap/cds";
import { LIST, SELECTOR, SELECT } from "./handler.agents.list";
import layoutWrapMiddleware from "./middleware.layout";
import { DASHBOARD } from "./handler.agents.dashboard";
import { GET as GET_PANEL, POST as POST_PANEL, Title } from "./handler.agents.panel";
import { RESOURCES, RESOURCES_PANE, RESOURCES_CARD, RESOURCES_TOGGLE, RESOURCES_ENABLE, RESOURCES_DISABLE } from "./handler.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.policy.rules";
import { agentsDataMiddleware } from "./middleware.agents";
import policyMiddleware from "./middleware.policy";
import { resourcesMiddleware } from "./middleware.resources";
import { pushMiddleware } from "./middleware.policy.push";
import { default as GET_POLICY } from "./handler.policy";
import { agents, versions } from "#cds-models/sap/scai/grants/policies/PoliciesService";
import { GET as GET_PUBLISH, POST as POST_PUBLISH } from "./handler.agents.publish";


 

export default class PoliciesService extends cds.ApplicationService {
  init() {
    this.on("dashboard", DASHBOARD);

    this.before(["READ", "view", "edit", "list", "selector", "select"], agents, agentsDataMiddleware);
    this.on("view", agents, LIST);
    this.on("READ", agents, LIST);
    this.on("panel", agents, GET_PANEL);
    this.on("selector", agents, SELECTOR);
    this.on("select", agents, SELECT);

    this.on("CREATE", agents, POST_PANEL);
    this.on("UPDATE", agents, POST_PANEL);

    this.before(["*"], versions, policyMiddleware);
    this.before(["UPDATE", "CREATE", "publish"], versions, pushMiddleware);

    this.before(["READ", "pane", "card", "toggle", "enable", "disable"], "resources", compose(policyMiddleware, resourcesMiddleware));
    this.on("pane", "resources", RESOURCES_PANE);
    this.on("card", "resources", RESOURCES_CARD);
    this.on("toggle", "resources", RESOURCES_TOGGLE);
    this.on("enable", "resources", RESOURCES_ENABLE);
    this.on("disable", "resources", RESOURCES_DISABLE);
    this.on("READ", versions, GET_POLICY);
    this.on("title", versions, Title);
    this.on("publisher", versions, GET_PUBLISH);
    this.on("publish", versions, POST_PUBLISH);
    this.on("edit", versions, GET_PANEL);
    this.on("resources", versions, RESOURCES);
    this.on("rules", versions, RULES);
    this.on("addRule", versions, ADD_RULE);
    this.on("removeRule", versions, REMOVE_RULE);

    return super.init();
  }
}

function compose(...middlewares: cds.EventHandler[]): cds.EventHandler {
  return async function(req: cds.Request) { 
    for (const middleware of middlewares) {
      await middleware(req);
    }
  };
}

function composeOn(...middlewares: cds.OnEventHandler[]): cds.OnEventHandler {
  return async function(req: cds.Request) { 
    //we should call the middlewares in the order they are added , but as nested next functions
    let next = async () => {
      return await middlewares[0](req, next);
    };
    for (let i = 1; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      next = async () => {
        return await middleware(req, next);
      }
    }
    return await next();
  };
}

