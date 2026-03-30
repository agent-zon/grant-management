package entity

import (
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/models"
)

type Instance struct {
	ID        string              `db:"ID"`
	Schema    dcn.SchemaAttribute `db:"SCHEMA"`
	Resources []models.Tool       `db:"RESOURCES"`
}
