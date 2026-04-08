package api

import (
	"io"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"mcp-ams/internal/api/handlers/assignment"
	"mcp-ams/internal/api/handlers/decision"
	"mcp-ams/internal/api/handlers/policy"
	"mcp-ams/internal/db"
	"mcp-ams/internal/githubpolicies"
)

// Server represents the HTTP server for the MCP-AMS application
type Server struct {
	router *mux.Router
	port   string
	db     *db.InMemoryDB
}

// NewServer creates a new HTTP server instance. gitCfg may be nil when MCP_AMS_GITHUB_TOKEN is unset.
func NewServer(port string, db *db.InMemoryDB, gitCfg *githubpolicies.Config) *Server {
	server := &Server{
		router: mux.NewRouter(),
		port:   port,
		db:     db,
	}

	policyResource := policy.NewPolicyResource(db)
	decisionResource := decision.NewDecisionResource(db, gitCfg)
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
	// Raw echo: no AMS/DB/Git/goroutines — reads body and writes it back (max 32 MiB). CAP: AMS_DEBUG_ECHO=1.
	s.router.HandleFunc("/debug/echo", debugEchoHandler).Methods(http.MethodPost, http.MethodOptions)
	s.router.HandleFunc("/policies/{ref}/evaluate", decisionRes.PoliciesRefEvaluateHandler).Methods(http.MethodGet, http.MethodPost, http.MethodOptions)
	v1.HandleFunc("/mcp-servers/{serverID}/tools", policyResource.UpdateMCPToolsHandler).Methods("POST")

	v1.HandleFunc("/mcp-servers/{serverID}/resources", policyResource.GetPolicyResourcesHandler).Methods("GET")
	//v1.HandleFunc("/mcp-servers/{id}/resources/{resourceName}", policyResource.GetPolicyResourceHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/resources/{resourceName}/attributes", policyResource.GetAttributesForResourcesHandler).Methods("GET")

	v1.HandleFunc("/mcp-servers/{serverID}/policies", policyResource.CreatePolicyHandler).Methods("POST")
	v1.HandleFunc("/mcp-servers/{serverID}/policies", policyResource.GetPoliciesHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/policies/{policyID}", policyResource.GetPolicyHandler).Methods("GET")
	v1.HandleFunc("/mcp-servers/{serverID}/policies{policyID}", policyResource.DeletePolicyHandler).Methods("DELETE")

	// Stateless batch: inline DCN + env + app + tools → filtered discovery (no agent/version in path).
	v1.HandleFunc("/decision/filter-tools", decisionRes.FilterToolsDiscoveryHandler).Methods("POST")

	v1.HandleFunc("/agents/{agentID}/versions/{versionRef}/mcp-servers/{serverID}/decision/useTool", decisionRes.IsUsageAuthorizedHandler).Methods("POST")
	v1.HandleFunc("/agents/{agentID}/versions/{versionRef}/mcp-servers/{serverID}/decision/listTools", decisionRes.ListAuthorizedToolsHandler).Methods("GET")

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

const maxDebugEchoBody = 32 << 20 // 32 MiB

func debugEchoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, maxDebugEchoBody+1))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if len(body) > maxDebugEchoBody {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		return
	}
	if ct := r.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}
