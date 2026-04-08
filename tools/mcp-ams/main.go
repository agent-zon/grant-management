package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/api"
	"mcp-ams/internal/db/entity"
	"mcp-ams/internal/examples"
	"mcp-ams/internal/inmem"
	"mcp-ams/internal/models"
	"mcp-ams/internal/transformer"
)

func mustTransformSchema() dcn.SchemaAttribute {
	var mcpSchema models.MCPSchema
	if err := json.Unmarshal(examples.GitHubMCP, &mcpSchema); err != nil {
		log.Fatalf("Error parsing MCP schema: %v", err)
	}
	dcnSchema, err := transformer.Transform(mcpSchema)
	if err != nil {
		log.Fatalf("Error transforming schema: %v", err)
	}
	return *dcnSchema
}

func main() {
	dcnSchemaContainer := dcn.DcnContainer{
		Version: 1,
		Schemas: []dcn.Schema{
			{
				QualifiedName: []string{"schema"},
				Definition:    mustTransformSchema(),
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

	inMemDB, err := inmem.NewServerDB()
	if err != nil {
		log.Fatalf("Error building in-memory DB: %v", err)
	}
	githubMCPID := inmem.DefaultMCPServerID
	for _, dcnPol := range LoadPolicies("client/testdata") {
		inMemDB.Policies[githubMCPID] = append(inMemDB.Policies[githubMCPID], entity.Policy{
			ID:          uuid.New(),
			MCPServerID: githubMCPID,
			Name:        strings.Join(dcnPol.QualifiedName, "."),
			Policy:      dcnPol,
		},
		)
	}

	// Start HTTP server (no GitHub in-process: eval uses inline DCN from clients; persist is done by scripts/CAP).
	port := getEnvOrDefault("PORT", "8687")
	server := api.NewServer(port, inMemDB, nil)

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
