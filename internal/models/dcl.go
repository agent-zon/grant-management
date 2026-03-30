package models

import (
	"strings"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

func GetAttributesForResource(schema dcn.SchemaAttribute, resourceName string) map[string]dcn.SchemaAttribute {
	splitN := strings.SplitN(resourceName, ".", 2)
	if len(splitN) != 2 {
		return map[string]dcn.SchemaAttribute{}
	}
	primitive := splitN[0]
	resourceName = splitN[1]

	if app, ok := schema.Nested["$app"]; ok {
		if app.Nested != nil {
			if p, ok := app.Nested[primitive]; ok {
				if p.Nested != nil {
					if r, ok := p.Nested[resourceName]; ok {
						return r.Nested
					}
				}
			}
		}
	}

	return map[string]dcn.SchemaAttribute{}
}
