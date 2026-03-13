using policies from './db/schema';

@path: '/policies'
@protocol: 'rest'
@impl: './policies-service.tsx'
service PoliciesService {

/** No DB table — Git is the source of truth. @cds.persistence.skip lets the
handler receive the raw POST body without property validation. */
@cds.persistence.skip
  entity AgentPolicies as projection on policies.AgentPolicies actions {
    /** Returns <option> HTML for the resource datalist — GET /policies/AgentPolicies/{id}/resources */
   function resources(agent: $self) returns String;
    /** Returns RulesSection HTML — GET /policies/AgentPolicies/{id}/rules */
   function rules(agent: $self) returns String;

function edit(agent: $self) returns String;

function view (in: many $self) returns String;

};

/** HTMX fragment: append one rule and re-render #rules-section */
action addRule(
    rules          : String,
    agentIdRules   : String,
    ruleAction     : String,
    target         : String,
    constraint     : String,
    constraintValue: String
  ) returns String;

/** HTMX fragment: remove rule at index and re-render #rules-section */
action removeRule(
    rules       : String,
    agentIdRules: String,
    index       : Integer
  ) returns String;

}