using policies from './db/schema';
namespace sap.scai.grants.policies;

@path    : '/admin'
@protocol: 'rest'
@impl    : './policies-service.tsx'
service PoliciesService {

  @cds.persistence.skip
  entity agents   as projection on policies.AgentPolicies
    actions {

      function view(in: many $self) returns String;

      function edit(agent: $self)   returns String; 
    }

  @cds.persistence.skip
  entity versions as projection on policies.Policies
    actions {
      function edit(version: $self)                                                                                                    returns String;

      function resources(version: $self)                                                                                               returns String;

      function rules(version: $self)                                                                                                   returns String;

      action   addRule(version: $self, rules: String, ruleAction: String, target: String, constraint: String, constraintValue: String) returns String;

      action   removeRule(version: $self, rules: String, index: Integer)                                                               returns String;

      action   save(version: $self, rules: String)                                                                                     returns String;

    };

}
