package models

// MCPSchema represents the root structure of an MCP schema
type MCPSchema struct {
	Tools []Tool `json:"tools"`
}

// Tool represents a single tool in the MCP schema
type Tool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema InputSchema `json:"inputSchema,omitempty"`
	Annotations Annotations `json:"annotations,omitempty"`
}

// InputSchema defines the input schema for a tool
type InputSchema struct {
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Enum        []string               `json:"enum,omitempty"` // only for primitive types
	Properties  map[string]InputSchema `json:"properties"`     // only for type object
	Required    []string               `json:"required"`       // only for type object
	Items       *InputSchema           `json:"items"`          // Only for type array
}

// Annotations contains additional metadata for tools
type Annotations struct {
	//Title        string `json:"title,omitempty"`
	//ReadOnlyHint bool   `json:"readOnlyHint,omitempty"`
}
