package githubpolicies

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

// ruleJSON supports repo files that use "rule" instead of "effect".
type ruleJSON struct {
	Effect      string          `json:"effect"`
	Rule        string          `json:"rule"`
	Actions     []string        `json:"actions"`
	Resources   []string        `json:"resources"`
	Condition   json.RawMessage `json:"condition,omitempty"`
	Role        bool            `json:"role,omitempty"`
	Annotations json.RawMessage `json:"annotations,omitempty"`
}

type policyJSON struct {
	Policy        []string          `json:"policy"`
	Rules         []ruleJSON        `json:"rules"`
	Uses          []dcn.Use         `json:"uses,omitempty"`
	Description   string            `json:"description,omitempty"`
	Default       bool              `json:"default,omitempty"`
	Internal      bool              `json:"internal,omitempty"`
	Annotations   map[string]any    `json:"annotations,omitempty"`
}

type containerJSON struct {
	Version   int             `json:"version"`
	Policies  []policyJSON    `json:"policies"`
	Functions []dcn.Function  `json:"functions"`
	Schemas   []dcn.Schema    `json:"schemas"`
	Tests     []dcn.Test      `json:"tests"`
}

// ParseAndNormalizeContainer unmarshals JSON from Git, maps rule→effect, and keeps grant/deny rules (unknown effect values are dropped).
func ParseAndNormalizeContainer(raw []byte) (dcn.DcnContainer, error) {
	var cj containerJSON
	if err := json.Unmarshal(raw, &cj); err != nil {
		return dcn.DcnContainer{}, err
	}
	out := dcn.DcnContainer{
		Version:   cj.Version,
		Functions: cj.Functions,
		Schemas:   cj.Schemas,
		Tests:     cj.Tests,
	}
	for _, pj := range cj.Policies {
		pol := dcn.Policy{
			QualifiedName: pj.Policy,
			Uses:          pj.Uses,
			Description:   pj.Description,
			Default:       pj.Default,
			Internal:      pj.Internal,
			Annotations:   pj.Annotations,
		}
		for _, rj := range pj.Rules {
			effect := strings.TrimSpace(rj.Effect)
			if effect == "" {
				effect = strings.TrimSpace(rj.Rule)
			}
			if effect == "" {
				effect = "grant"
			}
			if effect != "grant" && effect != "deny" {
				continue
			}
			var cond *dcn.Expression
			if len(rj.Condition) > 0 && string(rj.Condition) != "null" {
				var ex dcn.Expression
				if err := json.Unmarshal(rj.Condition, &ex); err != nil {
					return dcn.DcnContainer{}, fmt.Errorf("policy %v rule condition: %w", pj.Policy, err)
				}
				cond = &ex
			}
			var ann map[string]any
			if len(rj.Annotations) > 0 && string(rj.Annotations) != "null" {
				_ = json.Unmarshal(rj.Annotations, &ann)
			}
			pol.Rules = append(pol.Rules, dcn.Rule{
				Effect:      effect,
				Actions:     rj.Actions,
				Resources:   rj.Resources,
				Condition:   cond,
				Role:        rj.Role,
				Annotations: ann,
			})
		}
		out.Policies = append(out.Policies, pol)
	}
	return out, nil
}

// PolicyQualifiedName returns the dotted name used in actas / activePolicy.
func PolicyQualifiedName(p dcn.Policy) string {
	return strings.Join(p.QualifiedName, ".")
}

// PolicyEvalFileSlug maps a qualified policy name to a single path segment (filename stem under agent/eval/).
func PolicyEvalFileSlug(qualified string) string {
	s := strings.TrimSpace(qualified)
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ReplaceAll(s, "\\", "_")
	s = strings.Trim(s, ".")
	if s == "" {
		return "_empty"
	}
	return s
}

// SelectPoliciesForEval returns policy names and copies for AMS eval.
// activePolicy empty → default:true policy, else first policy in file (no default flag required).
// non-empty → only that policy by qualified name.
func SelectPoliciesForEval(container dcn.DcnContainer, activePolicy string) (names []string, policies []dcn.Policy, err error) {
	activePolicy = strings.TrimSpace(activePolicy)
	if activePolicy == "" {
		for i := range container.Policies {
			if container.Policies[i].Default {
				p := container.Policies[i]
				return []string{PolicyQualifiedName(p)}, []dcn.Policy{p}, nil
			}
		}
		if len(container.Policies) > 0 {
			p := container.Policies[0]
			return []string{PolicyQualifiedName(p)}, []dcn.Policy{p}, nil
		}
		return nil, nil, fmt.Errorf("no policies in DCN")
	}
	for i := range container.Policies {
		p := container.Policies[i]
		if PolicyQualifiedName(p) == activePolicy {
			return []string{activePolicy}, []dcn.Policy{p}, nil
		}
	}
	return nil, nil, fmt.Errorf("unknown activePolicy %q", activePolicy)
}
