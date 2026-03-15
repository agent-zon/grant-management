import cds from "@sap/cds";
import { LIST } from "./handler.agents.view";
import { GET_REDIRECT } from "./handler.agents.edit";
import { GET_EDIT, POST_SAVE } from "./handler.version.edit";
import { RESOURCES } from "./handler.version.resources";
import { ADD_RULE, REMOVE_RULE, RULES } from "./handler.version.rules";
import { agentsDataMiddleware, default as LIST_DATA } from "./handler.agents";
import { versionDataMiddleware, default as GET_VERSION } from "./handler.version";
import { agents, versions } from "#cds-models/sap/scai/grants/policies/PoliciesService";
export default class PoliciesService extends cds.ApplicationService {
  init() {
    this.before(["READ", "view", "edit"], agents, agentsDataMiddleware);
    this.on("edit", agents, GET_REDIRECT);
    this.on("view", agents, LIST);
    this.on("READ", agents, LIST_DATA);

    this.before(["*"], versions, versionDataMiddleware);
    this.on("CREATE", agents, POST_SAVE);
    this.on("UPDATE", agents, POST_SAVE);

    this.on("READ", "versions", GET_VERSION);
    this.on("edit", "versions", GET_EDIT);
    this.on("save", "versions", POST_SAVE);
    this.on("resources", "versions", RESOURCES);
    this.on("rules", "versions", RULES);
    this.on("addRule", "versions", ADD_RULE);
    this.on("removeRule", "versions", REMOVE_RULE);

    return super.init();
  }
}
