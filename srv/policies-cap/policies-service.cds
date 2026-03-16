using policies from './db/schema';

namespace sap.scai.grants.policies;

@path    : '/admin'
@protocol: 'rest'
@impl    : './policies-service.tsx'
service PoliciesService {
  function dashboard() returns String;

  @cds.persistence.skip
  entity agents   as projection on policies.AgentPolicies
    actions {
      function view(in: many $self)    returns String;
      function list(in: many $self)    returns String;
      function panel(agent: $self)     returns String;
      function selector(agent: $self)  returns String;
      action   ![select](agent: $self) returns String;
    }

  @cds.persistence.skip
  entity versions as projection on policies.Policies
    actions {
      function edit(version: $self)                                                                                                    returns String;
      function title(version: $self) returns String;
      function resources(version: $self)                                                                                               returns String;
      action   addResource(version: $self, destinationName: String) returns String;
      function rules(version: $self)                                                                                                   returns String;
      action   addRule(version: $self, odrl: String, ruleAction: String, target: String, constraint: String, constraintValue: String) returns String;
      action   removeRule(version: $self, odrl: String, removeKind: String, removeIndex: Integer) returns String;
      function publisher(version: $self)                                                                                               returns String;
      action   publish(version: $self, odrl: String) returns String;

    };

  @cds.persistence.skip
  entity resources as projection on policies.VersionResources
    actions {
      function pane(in: many $self) returns String;
      function card() returns String;  // full card with data (fetched on demand)
      function toggle() returns String;
      action   enable() returns String;
      action   disable() returns String;
    };

}
