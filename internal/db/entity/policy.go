package entity

import (
	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

type Policy struct {
	ID          uuid.UUID  `db:"ID"`
	MCPServerID string     `db:"MCP_SERVER_ID"`
	Name        string     `db:"NAME"`
	Policy      dcn.Policy `db:"CONTENT"`
}
