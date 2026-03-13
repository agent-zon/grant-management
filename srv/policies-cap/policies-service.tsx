import cds from "@sap/cds";
import { LIST } from "./handler.list";
import { GET, POST } from "./handler.edit";
import { RESOURCES } from "./handler.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.rules";
import LIST_DATA from "./handler.list.data";
export default class PoliciesService extends cds.ApplicationService {
  init() {
    // Single GET → policy editor; falls through to LIST for collection
    this.on("edit", "AgentPolicies", GET);
    // Collection GET → agents dashboard
    this.on("view", "AgentPolicies", LIST);
    // POST/PUT → commit policies to Git
    this.on("CREATE", "AgentPolicies", POST);
    this.on("UPDATE", "AgentPolicies", POST);
    this.on("READ", "AgentPolicies", LIST_DATA);
    // Bound function: GET /policies/AgentPolicies/{id}/resources → <option> datalist
    this.on("resources", "AgentPolicies", RESOURCES);
    // Bound function: GET /policies/AgentPolicies/{id}/rules → RulesSection HTML
    this.on("rules", "AgentPolicies", RULES);
    // HTMX rule fragments
    this.on("addRule", ADD_RULE);
    this.on("removeRule", REMOVE_RULE);
    return super.init();
  }
}
