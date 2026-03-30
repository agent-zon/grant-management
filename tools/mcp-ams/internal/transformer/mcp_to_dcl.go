package transformer

import (
	"errors"
	"fmt"
	"log"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/models"
)

// Transform converts an MCP schema to DCL format
func Transform(mcpSchema models.MCPSchema) (*dcn.SchemaAttribute, error) {
	if len(mcpSchema.Tools) == 0 {
		return nil, fmt.Errorf("no tools found in MCP schema")
	}

	// Create root structure
	root := &dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: make(map[string]dcn.SchemaAttribute),
	}

	// Create tools container
	appNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: make(map[string]dcn.SchemaAttribute),
	}

	root.Nested["$app"] = appNode

	// Create tools container
	toolsNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: make(map[string]dcn.SchemaAttribute),
	}
	appNode.Nested["tools"] = toolsNode

	// Wildcard entry: union of all tool attributes + common meta attributes
	wildcardNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: make(map[string]dcn.SchemaAttribute),
	}

	// Process each tool
	for _, tool := range mcpSchema.Tools {
		toolNode := transformTool(tool)
		toolsNode.Nested[tool.Name] = toolNode
		for attrName, attrDef := range toolNode.Nested {
			wildcardNode.Nested[attrName] = attrDef
		}
	}

	// MCP card _meta attributes used in policies
	for _, metaAttr := range []string{
		"riskLevel", "accessLevel", "dataClassification",
		"category", "environment", "toolName", "enabled",
		"description", "source", "createdBy",
	} {
		if _, exists := wildcardNode.Nested[metaAttr]; !exists {
			wildcardNode.Nested[metaAttr] = dcn.SchemaAttribute{Type: "String"}
		}
	}

	toolsNode.Nested["*"] = wildcardNode

	return root, nil
}

func ExtractToolNames(mcpSchema models.MCPSchema) []models.Tool {
	var res []models.Tool
	for i := range mcpSchema.Tools {
		res = append(res, models.Tool{
			Name:        mcpSchema.Tools[i].Name,
			Description: mcpSchema.Tools[i].Description,
		})
	}

	return res
}

// transformTool converts a single MCP tool to DCL format
func transformTool(tool models.Tool) dcn.SchemaAttribute {
	toolNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: make(map[string]dcn.SchemaAttribute),
	}

	// Transform each property in the input schema
	for propName, prop := range tool.InputSchema.Properties {
		p, err := transformProperty(prop)
		if err != nil {
			if errors.Is(err, ErrUnsupportedType) {
				log.Println("ignored", err, "for property name", propName)
				continue // Currently the AMS DCL does not support array of objects
			}
			panic(err)
		}
		toolNode.Nested[propName] = p
	}

	return toolNode
}

var ErrUnsupportedType = errors.New("unsupported type array of objects")
var ErrUnkownType = errors.New("unkown type ")

// transformProperty converts a single MCP property to DCL format
func transformProperty(prop models.InputSchema) (dcn.SchemaAttribute, error) {

	attribute, err := mapJSONTypeToDCLAttribute(prop)
	if err != nil {
		return dcn.SchemaAttribute{}, err
	}

	node := dcn.SchemaAttribute{
		Type: attribute,
	}

	// If it's an object type, we would need to handle nested properties
	// For now, we're dealing with primitive types based on the example

	return node, err
}

// mapJSONTypeToDCLAttribute maps JSON schema types to DCL attributes
func mapJSONTypeToDCLAttribute(prop models.InputSchema) (string, error) {
	switch prop.Type {
	case "string":
		return "String", nil
	case "number":
		return "Number", nil
	case "boolean":
		return "Bool", nil
	case "object":
		return "Structure", nil
	case "array":
		arrType, err := mapJSONTypeToDCLAttribute(*prop.Items)
		if err != nil {
			return "", err
		}
		if arrType == "Structure" {
			return "", ErrUnsupportedType
		}
		return arrType + "Array", nil

	default:
		return "", fmt.Errorf("%w %s", ErrUnkownType, prop.Type)
	}
}
