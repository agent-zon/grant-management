namespace sap.scai.grants;

using sap.scai.grants as grants from '../../db/grants.cds';

type EvaluationSubject {
    type: String;
    id: String;
    properties: Map;
}

type EvaluationAction {
    name: String;
    properties: Map;
}

type EvaluationResource {
    type: String;
    id: String;
    properties: Map;
}

// EvaluationContext is just a Map - no need for a separate type

type EvaluationRequest {
    subject: EvaluationSubject;
    action: EvaluationAction;
    resource: EvaluationResource;
    context: Map;
}

type EvaluationResponse {
    decision: Boolean;
    context: Map;
    grant_id: String;
}

type EvaluationOptions {
    evaluations_semantic: String; // execute_all, deny_on_first_deny, permit_on_first_permit
}

type EvaluationMetadata {
    policy_decision_point: String;
    access_evaluation_endpoint: String;
    access_evaluations_endpoint: String;
    search_subject_endpoint: String;
    search_resource_endpoint: String;
    search_action_endpoint: String;
    capabilities: array of String;
}

@path: '/access/v1'
@impl: './evaluation-service.tsx'
@protocol: 'rest'
@title: 'Authorization Evaluation API'
@Core.Description: 'Authorization API (AuthZEN) for access evaluation'
@Core.LongDescription: 'Implements Authorization API 1.0 specification for evaluating access requests using grant management and authorization details.'
@requires: ['authenticated-user', 'system-user']
service EvaluationService {
    
    // Access Evaluation API - single evaluation
    @method: ['POST']
    action evaluation(
        subject: EvaluationSubject,
        action: EvaluationAction,
        resource: EvaluationResource,
        context: Map
    ) returns EvaluationResponse;

    // Access Evaluations API - batch evaluation
    @method: ['POST']
    action evaluations(
        subject: EvaluationSubject,
        action: EvaluationAction,
        resource: EvaluationResource,
        context: Map,
        evaluations: array of EvaluationRequest,
        options: EvaluationOptions
    ) returns {
        evaluations: array of EvaluationResponse;
    };

    // Policy Decision Point Metadata
    @method: ['GET']
    function metadata() returns EvaluationMetadata;
}
