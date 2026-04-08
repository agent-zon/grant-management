package inmem

import (
	"encoding/json"

	"mcp-ams/internal/db"
	"mcp-ams/internal/db/entity"
	"mcp-ams/internal/examples"
	"mcp-ams/internal/models"
	"mcp-ams/internal/transformer"
)

// NewServerDB builds the same in-memory MCP schema + DB as the HTTP server (for CLI eval).
func NewServerDB() (*db.InMemoryDB, error) {
	var mcpSchema models.MCPSchema
	if err := json.Unmarshal(examples.GitHubMCP, &mcpSchema); err != nil {
		return nil, err
	}
	dcnSchema, err := transformer.Transform(mcpSchema)
	if err != nil {
		return nil, err
	}
	toolNames := transformer.ExtractToolNames(mcpSchema)
	githubMCPID := "11111111-1111-1111-1111-111111111111"
	inMemDB := db.NewInMemoryDB()
	inMemDB.McpServers[githubMCPID] = entity.Instance{
		ID:        githubMCPID,
		Schema:    *dcnSchema,
		Resources: toolNames,
	}
	return inMemDB, nil
}

// DefaultMCPServerID matches api server overwriteIDPathParam.
const DefaultMCPServerID = "11111111-1111-1111-1111-111111111111"
