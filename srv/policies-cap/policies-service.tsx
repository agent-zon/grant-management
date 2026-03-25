import cds from "@sap/cds";
import { LIST, SELECTOR, SELECT } from "./handler.agents.list";
import layoutWrapMiddleware from "./middleware.layout";
import { DASHBOARD } from "./handler.agents.dashboard";
import { GET as GET_PANEL, POST as POST_PANEL, Title } from "./handler.agents.panel";
import { RESOURCES, RESOURCES_PANE,  RESOURCES_CARD, RESOURCES_TOGGLE, RESOURCES_ENABLE, RESOURCES_DISABLE } from "./handler.resources";
import { RESOURCES_CONNECT_PICKER, ADD_RESOURCE } from "./handler.resources.connect";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.policy.rules";
import { CONSTRAINTS, CONSTRAINT_VALUES, RESOURCE_CONSTRAINTS, RESOURCE_CONSTRAINT_VALUES } from "./handler.policy.constraints";
import { TEST } from "./handler.agents.test";
import { USE } from "./handler.agents.use";
import { agentsDataMiddleware, paramsToData } from "./middleware.agents";
import policyMiddleware from "./middleware.policy";
import { resourcesMiddleware } from "./middleware.resources";
import { pushMiddleware } from "./middleware.policy.push";
import { default as GET_POLICY } from "./handler.policy";
import { agents, versions } from "#cds-models/sap/scai/grants/policies/PoliciesService";
import { GET as GET_PUBLISH, POST as POST_PUBLISH } from "./handler.agents.publish";


 

export default class PoliciesService extends cds.ApplicationService {
  init() {
    this.on("dashboard", DASHBOARD);
    this.before(["*"], agents, paramsToData);

    this.before(["READ", "view", "edit", "list", "selector", "select"], agents, compose(paramsToData, agentsDataMiddleware));
    this.on("view", agents, LIST);
    this.on("READ", agents, LIST);
    this.on("READ", agents, GET_PANEL);

    this.on("panel", agents, GET_PANEL);
    this.on("selector", agents, SELECTOR);
    this.on("select", agents, SELECT); 
    this.on("CREATE", agents, POST_PANEL);
    this.on("UPDATE", agents, POST_PANEL);

    this.before(["*"], "resources", paramsToData);

    this.before(["READ", "pane", "slot", "card", "connect", "connecter","toggle", "enable", "disable" , "constraints", "constraintValues"], "resources", compose(paramsToData, agentsDataMiddleware,policyMiddleware, resourcesMiddleware));
    this.on("READ", "resources", RESOURCES_PANE);
    this.on("pane", "resources", RESOURCES_PANE);

    this.on("connect", "resources", ADD_RESOURCE);
    this.on("connecter", "resources", RESOURCES_CONNECT_PICKER);
    this.on("card", "resources", RESOURCES_CARD);
    this.on("toggle", "resources", RESOURCES_TOGGLE);
    this.on("enable", "resources", RESOURCES_ENABLE);
    this.on("disable", "resources", RESOURCES_DISABLE);
    this.on("constraints", "resources", RESOURCE_CONSTRAINTS);
    this.on("values", "resources", RESOURCE_CONSTRAINT_VALUES);

    this.before(["*"], versions, paramsToData);
    this.before(["UPDATE", "CREATE", "publish"], versions, compose(paramsToData, agentsDataMiddleware,policyMiddleware, resourcesMiddleware,pushMiddleware));
    this.before(["resources", "rules", "constraints", "values", "test", "use", "addRule", "removeRule"], versions, compose(paramsToData, agentsDataMiddleware,policyMiddleware, resourcesMiddleware));
    this.before(["title", "publisher","publish" ], versions, compose(paramsToData, agentsDataMiddleware));
  
    this.on("READ", versions, GET_PANEL);
    this.on("title", versions, Title);
    this.on("policy", versions, GET_POLICY);
    this.on("publisher", versions, GET_PUBLISH);
    this.on("publish", versions, POST_PUBLISH);
    this.on("edit", versions, GET_PANEL);
    this.on("resources", versions, RESOURCES);
    this.on("rules", versions, RULES);
    this.on("constraints", versions, CONSTRAINTS);
    this.on("values", versions, CONSTRAINT_VALUES);
    this.on("addRule", versions, ADD_RULE);
    this.on("removeRule", versions, REMOVE_RULE);
    this.on("test", versions, TEST);
    this.on("use", versions, USE);

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


