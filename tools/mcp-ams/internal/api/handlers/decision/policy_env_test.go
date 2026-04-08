package decision

import "testing"

func TestMergeEnvForPolicyQual_OBO(t *testing.T) {
	base := map[string]any{"grant": map[string]any{"privileged_mode": true}}
	out := MergeEnvForPolicyQual("obo_authenticated_user", base)
	actas, ok := out["actas"].(map[string]any)
	if !ok || actas["on_behalf_of_user"] != true {
		t.Fatalf("expected actas.on_behalf_of_user true, got %#v", out["actas"])
	}
	g := out["grant"].(map[string]any)
	if g["privileged_mode"] != true {
		t.Fatal("lost grant subtree")
	}
}

func TestMergeEnvForPolicyQual_Default(t *testing.T) {
	base := map[string]any{"tid": "x"}
	out := MergeEnvForPolicyQual("default", base)
	if _, ok := out["actas"]; ok {
		t.Fatalf("default policy should not inject actas, got %#v", out)
	}
}
