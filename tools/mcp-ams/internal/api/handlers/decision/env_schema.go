package decision

import (
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

// runtimeEnvInputSchema builds a DCN schema fragment so $env / $env.$user paths from InsertCustomInput
// survive PurgeInvalidInput (keys must exist in the merged schema).
func runtimeEnvInputSchema(env, user map[string]any) dcn.Schema {
	envAttr := schemaAttributeFromMap(env)
	if envAttr.Nested == nil {
		envAttr.Nested = map[string]dcn.SchemaAttribute{}
	}
	if len(user) > 0 {
		envAttr.Nested["$user"] = schemaAttributeFromMap(user)
	}
	return dcn.Schema{
		QualifiedName: []string{"runtime", "env", "input"},
		Definition: dcn.SchemaAttribute{
			Type: "Structure",
			Nested: map[string]dcn.SchemaAttribute{
				"$env": envAttr,
			},
		},
	}
}

func schemaAttributeFromMap(m map[string]any) dcn.SchemaAttribute {
	nested := make(map[string]dcn.SchemaAttribute)
	for k, v := range m {
		switch t := v.(type) {
		case map[string]any:
			nested[k] = schemaAttributeFromMap(t)
		default:
			nested[k] = schemaAttributeForLeaf(v)
		}
	}
	return dcn.SchemaAttribute{Type: "Structure", Nested: nested}
}

func schemaAttributeForLeaf(v any) dcn.SchemaAttribute {
	switch v.(type) {
	case bool:
		return dcn.SchemaAttribute{Type: "Boolean"}
	case float64:
		return dcn.SchemaAttribute{Type: "Number"}
	case int:
		return dcn.SchemaAttribute{Type: "Number"}
	case int64:
		return dcn.SchemaAttribute{Type: "Number"}
	case string:
		return dcn.SchemaAttribute{Type: "String"}
	case []any:
		return dcn.SchemaAttribute{Type: "String"}
	default:
		return dcn.SchemaAttribute{Type: "String"}
	}
}
