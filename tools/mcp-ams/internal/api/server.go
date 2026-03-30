package api

import (
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"mcp-ams/internal/api/handlers/assignment"
	"mcp-ams/internal/api/handlers/decision"
	"mcp-ams/internal/api/handlers/policy"
	"mcp-ams/internal/db"
)

// Server represents the HTTP server for the MCP-AMS application
type Server struct {
	router *mux.Router
	port   string
	db     *db.InMemoryDB
}

// NewServer creates a new HTTP server instance
func NewServer(port string, db *db.InMemoryDB) *Server {
	server := &Server{
		router: mux.NewRouter(),
		port:   port,
		db:     db,
	}

	policyResource := policy.NewPolicyResource(db)
	decisionResource := decision.NewDecisionResource(db)
	assignmentRes := assignment.NewAssignmentResource(db)

	server.router.Use(func(next http.Handler) http.Handler {
		return handlers.LoggingHandler(os.Stdout, next)
	})
	server.setupRoutes(policyResource, decisionResource, assignmentRes)
	return server
}

// setupRoutes configures all the HTTP routes
func (s *Server) setupRoutes(policyResource *policy.PolicyResource, decisionRes *decision.DecisionResource, assignmentRes *assignment.AssignmentResource) {
	// API v1 routes
	v1 := s.router.PathPrefix("/sap/scai/v1/authz").Subrouter()
	v1.Use(corsMiddleware)
	v1.Use(overwriteIDPathParam)

	s.router.PathPrefix("").Methods("OPTIONS").HandlerFunc(preflightOptionsHandler)
	s.router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	v1.HandleFunc("/mcp-servers/{serverID}/tools", policyResource.UpdateMCPToolsHandler).Methods("POST")

	v1.HandleFunc("/mcp-servers/{serverID}/resources", policyResource.GetPolicyResourcesHandler).Methods("GET")
	//v1.HandleFunc("/mcp-servers/{id}/resources/{resourceName}", policyResource.GetPolicyResourceHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/resources/{resourceName}/attributes", policyResource.GetAttributesForResourcesHandler).Methods("GET")

	v1.HandleFunc("/mcp-servers/{serverID}/policies", policyResource.CreatePolicyHandler).Methods("POST")
	v1.HandleFunc("/mcp-servers/{serverID}/policies", policyResource.GetPoliciesHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/policies/{policyID}", policyResource.GetPolicyHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/policies{policyID}", policyResource.DeletePolicyHandler).Methods("DELETE")

	v1.HandleFunc("/agents/{agentID}/mcp-servers/{serverID}/policies", assignmentRes.GetAssignedPoliciesHandler).Methods("GET")
	v1.HandleFunc("/agents/{agentID}/mcp-servers/{serverID}/policies/{policyID}", assignmentRes.CreateAssignmentHandler).Methods("PUT")
	v1.HandleFunc("/agents/{agentID}/mcp-servers/{serverID}/policies/{policyID}", assignmentRes.DeleteAssignmentHandler).Methods("DELETE")

	v1.HandleFunc("/agents/{agentID}/mcp-servers/{serverID}/decision/useTool", decisionRes.IsUsageAuthorizedHandler).Methods("POST")
	v1.HandleFunc("/agents/{agentID}/mcp-servers/{serverID}/decision/listTools", decisionRes.ListAuthorizedToolsHandler).Methods("GET")
}

// Start starts the HTTP server
func (s *Server) Start() error {
	return http.ListenAndServe(":"+s.port, s.router)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		next.ServeHTTP(w, r)
	})
}

func overwriteIDPathParam(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		vars["serverID"] = "11111111-1111-1111-1111-111111111111"
		next.ServeHTTP(w, mux.SetURLVars(r, vars))
	})
}

func preflightOptionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.WriteHeader(http.StatusOK)
}
