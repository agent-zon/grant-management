import cds from "@sap/cds";
import { LIST } from "./handler.agents.view";
import { GET_REDIRECT } from "./handler.agents.edit";
import { GET_EDIT, POST_SAVE } from "./handler.version.edit";
import { RESOURCES } from "./handler.version.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.version.rules";
import LIST_DATA from "./handler.agents";
import GET_VERSION from "./handler.version";

export default class PoliciesService extends cds.ApplicationService {
  init() {
    this.on("edit", "AgentPolicies", GET_REDIRECT);
    this.on("view", "AgentPolicies", LIST);
    this.on("READ", "AgentPolicies", LIST_DATA);
    this.on("CREATE", "AgentPolicies", POST_SAVE);
    this.on("UPDATE", "AgentPolicies", POST_SAVE);

    this.on("READ", "AgentPolicyVersions", GET_VERSION);

    this.on("edit", "AgentPolicyVersions", GET_EDIT);
    this.on("save", "AgentPolicyVersions", POST_SAVE);
    this.on("resources", "AgentPolicyVersions", RESOURCES);
    this.on("rules", "AgentPolicyVersions", RULES);
    this.on("addRule", "AgentPolicyVersions", ADD_RULE);
    this.on("removeRule", "AgentPolicyVersions", REMOVE_RULE);

    return super.init();
  }
}
