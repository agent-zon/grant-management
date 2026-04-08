package decision

import "encoding/json"

// FilterToolsDiscoveryRequest evaluates all tools in one round-trip. DCN is sent inline (no agent/version paths in mcp-ams).
type FilterToolsDiscoveryRequest struct {
	Dcn          json.RawMessage `json:"dcn"`
	ActivePolicy string          `json:"activePolicy,omitempty"`
	Env          map[string]any  `json:"env,omitempty"`
	User         map[string]any  `json:"user,omitempty"`
	App          map[string]any  `json:"app,omitempty"`
	Tools        []ToolIn        `json:"tools"`
}

// ToolIn is one MCP tool from discovery (client may flatten _meta into Props).
type ToolIn struct {
	Name        string         `json:"name"`
	Title       string         `json:"title,omitempty"`
	Description string         `json:"description,omitempty"`
	Props       map[string]any `json:"props,omitempty"`
}

// ToolOut is one tool with policy decision.
type ToolOut struct {
	Name        string `json:"name"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	Granted     bool   `json:"granted"`
	Denied      bool   `json:"denied"`
	Condition   string `json:"condition,omitempty"`
}

// FilterToolsDiscoveryResponse returns every tool with a decision plus granted-only list (filtered discovery).
type FilterToolsDiscoveryResponse struct {
	Tools        []ToolOut `json:"tools"`
	GrantedTools []ToolOut `json:"grantedTools"`
}

type UsageAuthorizedRequest struct {
	Primitive string `json:"primitive"`
	Name      string `json:"name"`
	//Input     expression.Input `json:"input"`
	Input map[string]any `json:"input"`
	// ActivePolicy is dotted qualified name; empty means evaluate only the default policy (Git mode).
	ActivePolicy string `json:"activePolicy,omitempty"`
}

type UsageAuthorizedResponse struct {
	Granted   bool   `json:"granted"`
	Denied    bool   `json:"denied"`
	Condition string `json:"condition,omitempty"`
}

// EvaluateInput is discovery sent to POST /policies/{ref}/evaluate (app = resource/server meta, tools = MCP tools).
type EvaluateInput struct {
	App   map[string]any `json:"app,omitempty"`
	Tools []ToolIn       `json:"tools"`
}

// PoliciesRefEvaluateRequest: ref (git SHA/branch) is in the path; policies loaded from Git unless dcn is inlined.
type PoliciesRefEvaluateRequest struct {
	AgentID      string          `json:"agentId"`
	ActivePolicy string          `json:"activePolicy,omitempty"`
	Env          map[string]any  `json:"env,omitempty"`
	User         map[string]any  `json:"user,omitempty"`
	Input        EvaluateInput   `json:"input"`
	Dcn          json.RawMessage `json:"dcn,omitempty"`
}

// PolicySliceResult is tools + grantedTools for one policy (POST fills byPolicy + active with real AMS when dcn is sent).
type PolicySliceResult struct {
	Policy       string    `json:"policy"`
	Tools        []ToolOut `json:"tools"`
	GrantedTools []ToolOut `json:"grantedTools"`
	Mock         bool      `json:"mock,omitempty"`
}

// PoliciesRefEvaluateResponse is returned by GET/POST /policies/{ref}/evaluate.
type PoliciesRefEvaluateResponse struct {
	Ref      string              `json:"ref"`
	AgentID  string              `json:"agentId"`
	ByPolicy []PolicySliceResult `json:"byPolicy"`
	Active   PolicySliceResult   `json:"active"`
}
