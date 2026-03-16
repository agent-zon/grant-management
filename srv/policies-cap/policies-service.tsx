import cds from "@sap/cds";
import { LIST, SELECTOR, SELECT } from "./handler.agents.list";
import layoutWrapMiddleware from "./middleware.layout";
import { DASHBOARD } from "./handler.agents.dashboard";
import { GET as GET_PANEL, POST as POST_PANEL, Title } from "./handler.agents.panel";
import { RESOURCES } from "./handler.policy.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.policy.rules";
import { agentsDataMiddleware } from "./middleware.agents";
import policyMiddleware from "./middleware.policy";
import { resourcesMiddleware } from "./middleware.policy.resources";
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

    // this.on("list", agents, LIST_SIDEBAR);


    this.on("CREATE", agents, POST_PANEL);
    this.on("UPDATE", agents, POST_PANEL);

    this.before(["*"], versions, policyMiddleware);
    this.before(["UPDATE", "CREATE", "publish"], versions, pushMiddleware);

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
