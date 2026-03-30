package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/api"
	"mcp-ams/internal/db"
	"mcp-ams/internal/db/entity"
	"mcp-ams/internal/models"
	"mcp-ams/internal/transformer"
)

//go:embed internal/examples/github-mcp.json
var mcpJSON []byte

func main() {
	// Parse MCP Schema
	var mcpSchema models.MCPSchema
	if err := json.Unmarshal(mcpJSON, &mcpSchema); err != nil {
		log.Fatalf("Error parsing MCP schema: %v", err)
	}

	// Transform to DCL
	dcnSchema, err := transformer.Transform(mcpSchema)
	if err != nil {
		log.Fatalf("Error transforming schema: %v", err)
	}

	dcnSchemaContainer := dcn.DcnContainer{
		Version: 1,
		Schemas: []dcn.Schema{
			{
				QualifiedName: []string{"schema"},
				Definition:    *dcnSchema,
			},
		},
	}

	// Output result
	dclJSON, err := json.MarshalIndent(dcnSchemaContainer, "", "    ")
	if err != nil {
		log.Fatalf("Error marshaling DCL result: %v", err)
	}

	fmt.Println("Transformed AMS DCL Schema:")
	fmt.Println(string(dclJSON))

	toolNames := transformer.ExtractToolNames(mcpSchema)
	githubMCPID := "11111111-1111-1111-1111-111111111111"
	inMemDB := db.NewInMemoryDB()
	inMemDB.McpServers[githubMCPID] = entity.Instance{
		ID:        githubMCPID,
		Schema:    *dcnSchema,
		Resources: toolNames,
	}
	for _, dcnPol := range LoadPolicies("client/testdata") {
		inMemDB.Policies[githubMCPID] = append(inMemDB.Policies[githubMCPID], entity.Policy{
			ID:          uuid.New(),
			MCPServerID: githubMCPID,
			Name:        strings.Join(dcnPol.QualifiedName, "."),
			Policy:      dcnPol,
		},
		)
	}

	// Start HTTP server
	port := getEnvOrDefault("PORT", "8687")
	server := api.NewServer(port, inMemDB)

	fmt.Printf("\nStarting HTTP server on port %s...\n", port)

	if err := server.Start(); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

// getEnvOrDefault returns environment variable value or default if not set
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func LoadPolicies(path string) []dcn.Policy {
	loader := dcn.NewLocalLoader(path, func(err error) {
		log.Fatalln(err)
	})
	dcnLoaded := <-loader.DCNChannel

	return dcnLoaded.Policies
}
