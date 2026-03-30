package policy

import (
	"time"

	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/models"
)

// ResourceResponse represents a tool in the API response
type ResourceResponse struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Annotations models.Annotations `json:"annotations"`
}

// ResourceListResponse represents the response for the tools list endpoint
type ResourceListResponse struct {
	Resources []ResourceResponse `json:"resources"`
}

type CreatePolicyRequest struct {
	MCPServerID string     `json:"mcpServerId"`
	Policy      dcn.Policy `json:"policy"`
}

type PoliciesListResponse struct {
	Policies []PoliciesResponse `json:"policies"`
}

type PoliciesResponse struct {
	ID              uuid.UUID  `json:"id"`
	MCPServerID     string     `json:"mcpServerId"`
	Policy          dcn.Policy `json:"policy"`
	LastModified    time.Time  `json:"lastModified"`
	ModifiedBy      string     `json:"modifiedBy"`
	AssignedToCount int        `json:"assignedToCount"`
}

// MCPInputSchemaRequest represents the request body for schema endpoint
type MCPInputSchemaRequest struct {
	Schema interface{} `json:"schema"`
}
