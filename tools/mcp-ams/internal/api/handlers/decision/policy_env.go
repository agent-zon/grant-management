package decision

import "strings"

// MergeEnvForPolicyQual returns a copy of base env with actas context applied when the evaluated
// policy is an on-behalf-of-user (OBO) authorization context — refs in DCN: ["$env","actas","on_behalf_of_user"].
func MergeEnvForPolicyQual(policyQualifiedName string, base map[string]any) map[string]any {
	out := cloneMapAny(base)
	if !policyActsOnBehalfOfUser(policyQualifiedName) {
		return out
	}
	var actas map[string]any
	if existing, ok := out["actas"].(map[string]any); ok && existing != nil {
		actas = cloneMapAny(existing)
	} else {
		actas = map[string]any{}
	}
	actas["on_behalf_of_user"] = true
	out["actas"] = actas
	return out
}

func policyActsOnBehalfOfUser(policyQualifiedName string) bool {
	p := strings.TrimSpace(strings.ToLower(policyQualifiedName))
	if p == "" {
		return false
	}
	if p == "obo_authenticated_user" {
		return true
	}
	if strings.HasPrefix(p, "obo_") {
		return true
	}
	return false
}

func cloneMapAny(m map[string]any) map[string]any {
	if m == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
