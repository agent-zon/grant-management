package entity

import (
	"github.com/google/uuid"
)

type Assignment struct {
	ID          uuid.UUID `db:"ID"`
	AgentID     string    `db:"AGENT_ID"`
	MCPServerID string    `db:"MCP_SERVER_ID"`
	PolicyID    uuid.UUID `db:"POLICY_ID"`
}
