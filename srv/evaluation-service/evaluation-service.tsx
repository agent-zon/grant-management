import cds from "@sap/cds";
import evaluation from "./handler.evaluation.tsx";
import evaluations from "./handler.evaluations.tsx";
import metadata from "./handler.metadata.tsx";

/**
 * Authorization Evaluation Service
 * Implements Authorization API (AuthZEN) 1.0 specification
 * Evaluates access requests by querying authorization_details directly
 */
export default class Service extends cds.ApplicationService {
  init() {
    console.log("🔍 Initializing EvaluationService...");

    // Register route handlers
    this.on("evaluation", evaluation);
    this.on("evaluations", evaluations);
    this.on("metadata", metadata);

    return super.init();
  }
}

export type EvaluationService = Service & typeof cds.ApplicationService;

