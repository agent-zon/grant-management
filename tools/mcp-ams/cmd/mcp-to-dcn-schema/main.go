// mcp-to-dcn-schema: stdin = {"tools":[...]} (MCP card tools) → stdout = DCN container JSON with schemas only.
package main

import (
	"encoding/json"
	"io"
	"os"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/models"
	"mcp-ams/internal/transformer"
)

func main() {
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		panic(err)
	}
	var schema models.MCPSchema
	if err := json.Unmarshal(raw, &schema); err != nil {
		os.Stderr.WriteString("stdin JSON: " + err.Error() + "\n")
		os.Exit(2)
	}
	if len(schema.Tools) == 0 {
		schema.Tools = []models.Tool{
			{Name: "_persist_placeholder", InputSchema: models.InputSchema{Type: "object", Properties: map[string]models.InputSchema{}}},
		}
	}
	root, err := transformer.Transform(schema)
	if err != nil {
		os.Stderr.WriteString(err.Error() + "\n")
		os.Exit(1)
	}
	def := *root
	container := dcn.DcnContainer{
		Version: 1,
		Schemas: []dcn.Schema{
			{
				QualifiedName: []string{"schema"},
				Definition:    def,
			},
		},
		Policies:  nil,
		Functions: nil,
		Tests:     nil,
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(container); err != nil {
		os.Exit(1)
	}
}
