package githubpolicies

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

func TestParseAndNormalizeContainer_RuleToEffect(t *testing.T) {
	raw := []byte(`{
		"version": 1,
		"policies": [
			{
				"policy": ["default"],
				"default": true,
				"rules": [
					{ "rule": "grant", "actions": ["access"], "resources": ["tools.x"] },
					{ "effect": "deny", "actions": ["access"], "resources": ["tools.y"] }
				]
			},
			{
				"policy": ["ctx", "one"],
				"rules": [
					{ "actions": ["access"], "resources": ["tools.z"] }
				]
			}
		],
		"functions": [],
		"tests": []
	}`)
	c, err := ParseAndNormalizeContainer(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Policies) != 2 {
		t.Fatalf("policies: %d", len(c.Policies))
	}
	if c.Policies[0].Rules[0].Effect != "grant" || c.Policies[0].Rules[1].Effect != "deny" {
		t.Fatalf("effects: %+v", c.Policies[0].Rules)
	}
	if c.Policies[1].Rules[0].Effect != "grant" {
		t.Fatalf("default effect: %q", c.Policies[1].Rules[0].Effect)
	}
}

func TestSelectPoliciesForEval(t *testing.T) {
	def := dcn.Policy{QualifiedName: []string{"default"}, Default: true, Rules: []dcn.Rule{{Effect: "grant"}}}
	ctx := dcn.Policy{QualifiedName: []string{"obo", "x"}, Rules: []dcn.Rule{{Effect: "grant"}}}
	c := dcn.DcnContainer{Policies: []dcn.Policy{def, ctx}}

	names, pols, err := SelectPoliciesForEval(c, "")
	if err != nil || len(names) != 1 || names[0] != "default" || len(pols) != 1 {
		t.Fatalf("default: names=%v err=%v", names, err)
	}

	names, pols, err = SelectPoliciesForEval(c, "obo.x")
	if err != nil || len(names) != 1 || names[0] != "obo.x" {
		t.Fatalf("active: names=%v err=%v", names, err)
	}

	_, _, err = SelectPoliciesForEval(c, "missing")
	if err == nil || !strings.Contains(err.Error(), "unknown") {
		t.Fatalf("expected unknown policy err, got %v", err)
	}

	noDef := dcn.DcnContainer{Policies: []dcn.Policy{
		{QualifiedName: []string{"root"}, Rules: []dcn.Rule{{Effect: "grant"}}},
		{QualifiedName: []string{"other"}, Rules: []dcn.Rule{{Effect: "deny"}}},
	}}
	names, pols, err = SelectPoliciesForEval(noDef, "")
	if err != nil || len(names) != 1 || names[0] != "root" || len(pols) != 1 {
		t.Fatalf("empty activePolicy without default: names=%v err=%v", names, err)
	}
}

func TestMarshalPoliciesDCNFile_UsesRuleKey(t *testing.T) {
	c := dcn.DcnContainer{
		Version: 1,
		Policies: []dcn.Policy{
			{
				QualifiedName: []string{"default"},
				Rules:         []dcn.Rule{{Effect: "grant", Actions: []string{"access"}, Resources: []string{"tools.x"}}},
			},
		},
	}
	b, err := MarshalPoliciesDCNFile(c)
	if err != nil {
		t.Fatal(err)
	}
	var wrap struct {
		Policies []struct {
			Rules []struct {
				Rule   string `json:"rule"`
				Effect string `json:"effect"`
			} `json:"rules"`
		} `json:"policies"`
	}
	if err := json.Unmarshal(b, &wrap); err != nil {
		t.Fatal(err)
	}
	if len(wrap.Policies) != 1 || len(wrap.Policies[0].Rules) != 1 {
		t.Fatalf("unmarshal: %s", string(b))
	}
	if wrap.Policies[0].Rules[0].Rule != "grant" {
		t.Fatalf("want rule=grant, got %+v", wrap.Policies[0].Rules[0])
	}
}
