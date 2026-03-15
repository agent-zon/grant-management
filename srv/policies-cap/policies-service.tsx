import cds from "@sap/cds";
import { LIST, LIST_SIDEBAR } from "./handler.agents.list";
import AgentPanel from "./handler.agents.panel";
import layoutWrapMiddleware from "./middleware.layout";
import { DASHBOARD } from "./handler.dashboard";
import { GET_EDIT, POST_SAVE } from "./handler.policy.edit";
import { RESOURCES } from "./handler.policy.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.policy.rules";
import { agentsDataMiddleware } from "./middleware.agents";
import policyMiddleware from "./middleware.policy";
import { resourcesMiddleware } from "./middleware.policy.resources";
import { pushMiddleware } from "./middleware.policy.push";
import { default as GET_POLICY } from "./handler.policy";
import { agents, versions } from "#cds-models/sap/scai/grants/policies/PoliciesService";
export default class PoliciesService extends cds.ApplicationService {
  init() {
    this.on("dashboard", DASHBOARD);

    this.before(["view", "edit", "READ", "list"], agents, agentsDataMiddleware);
    this.on("view", agents, LIST);
    this.on("READ", agents, LIST);
    this.on("panel", agents, AgentPanel);

    // this.on("list", agents, LIST_SIDEBAR);

    this.before(["*"], versions, policyMiddleware);
    this.before(["*"], versions, resourcesMiddleware);
    this.before(["UPDATE", "CREATE", "save"], versions, pushMiddleware);
    this.on("CREATE", agents, POST_SAVE);
    this.on("UPDATE", agents, POST_SAVE);
     
    this.on("READ", "versions", GET_POLICY);
    // this.on("edit", versions, layoutWrapMiddleware);
    this.on("edit", "versions", GET_EDIT);
    this.on("save", "versions", POST_SAVE);
    this.on("resources", "versions", RESOURCES);
    this.on("rules", "versions", RULES);
    this.on("addRule", "versions", ADD_RULE);
    this.on("removeRule", "versions", REMOVE_RULE);

    return super.init();
  }
}
