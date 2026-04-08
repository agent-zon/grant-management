package githubpolicies

import (
	"encoding/json"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

// policiesDCNFile is policies.json shape expected by CAP (rules use "rule", not "effect").
type policiesDCNFile struct {
	Version   int             `json:"version"`
	Policies  []policyDCNFile `json:"policies"`
	Functions []dcn.Function  `json:"functions,omitempty"`
	Schemas   []dcn.Schema    `json:"schemas,omitempty"`
	Tests     []dcn.Test      `json:"tests,omitempty"`
}

type policyDCNFile struct {
	Policy      []string       `json:"policy"`
	Rules       []ruleDCNFile  `json:"rules"`
	Uses        []dcn.Use      `json:"uses,omitempty"`
	Description string         `json:"description,omitempty"`
	Default     bool           `json:"default,omitempty"`
	Internal    bool           `json:"internal,omitempty"`
	Annotations map[string]any `json:"annotations,omitempty"`
}

type ruleDCNFile struct {
	Rule        string           `json:"rule"`
	Actions     []string         `json:"actions"`
	Resources   []string         `json:"resources"`
	Condition   *dcn.Expression  `json:"condition,omitempty"`
	Role        bool             `json:"role,omitempty"`
	Annotations map[string]any   `json:"annotations,omitempty"`
}

// MarshalPoliciesDCNFile serializes a normalized container as policies.json-compatible JSON (rule grant/deny).
func MarshalPoliciesDCNFile(c dcn.DcnContainer) ([]byte, error) {
	out := policiesDCNFile{
		Version:   c.Version,
		Functions: c.Functions,
		Schemas:   c.Schemas,
		Tests:     c.Tests,
	}
	if out.Version == 0 {
		out.Version = 1
	}
	for _, p := range c.Policies {
		rules := make([]ruleDCNFile, 0, len(p.Rules))
		for _, r := range p.Rules {
			rules = append(rules, ruleDCNFile{
				Rule:        r.Effect,
				Actions:     r.Actions,
				Resources:   r.Resources,
				Condition:   r.Condition,
				Role:        r.Role,
				Annotations: r.Annotations,
			})
		}
		out.Policies = append(out.Policies, policyDCNFile{
			Policy:      p.QualifiedName,
			Rules:       rules,
			Uses:        p.Uses,
			Description: p.Description,
			Default:     p.Default,
			Internal:    p.Internal,
			Annotations: p.Annotations,
		})
	}
	return json.MarshalIndent(out, "", "  ")
}
