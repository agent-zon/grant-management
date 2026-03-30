package policy

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"

	"mcp-ams/internal/db"
	"mcp-ams/internal/db/entity"
	"mcp-ams/internal/models"
)

type PolicyResource struct {
	db *db.InMemoryDB
}

func NewPolicyResource(db *db.InMemoryDB) *PolicyResource {
	return &PolicyResource{
		db: db,
	}
}

func (re *PolicyResource) GetPolicyResourcesHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}

	mcpServer, err := re.db.GetMCPServer(serverID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(fmt.Errorf("mcp server does not exist: %v", err).Error()))
		return
	}

	var resources []ResourceResponse
	for i := range mcpServer.Resources {
		resources = append(resources, ResourceResponse{
			Name:        mcpServer.Resources[i].Name,
			Description: mcpServer.Resources[i].Description,
			Annotations: mcpServer.Resources[i].Annotations,
		})
	}

	resourceResponse := ResourceListResponse{
		Resources: resources,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resourceResponse); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func (re *PolicyResource) GetAttributesForResourcesHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	resourceName := mux.Vars(r)["resourceName"]
	if resourceName == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("resourceName is required"))
		return
	}

	mcpServer, err := re.db.GetMCPServer(serverID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(fmt.Errorf("mcp server does not exist: %v", err).Error()))
		return
	}

	resourceAttributes := models.GetAttributesForResource(mcpServer.Schema, resourceName)

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(resourceAttributes)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf("error encoding response: %v", err)))
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (re *PolicyResource) CreatePolicyHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("error reading request body"))
		return
	}

	var policyReq CreatePolicyRequest
	if err := json.Unmarshal(body, &policyReq); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Sprintf("invalid JSON: %v", err)))
		return
	}

	policyEntity := entity.Policy{
		ID:          uuid.New(),
		MCPServerID: serverID,
		Name:        strings.Join(policyReq.Policy.QualifiedName, "."),
		Policy:      policyReq.Policy,
	}

	re.db.AddPolicy(serverID, policyEntity)

	w.WriteHeader(http.StatusCreated)
}
func (re *PolicyResource) DeletePolicyHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}

	policyID, err := uuid.Parse(mux.Vars(r)["policyID"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("policy id in path is not a valid uuid").Error()))
		return
	}

	re.db.DeletePolicy(serverID, policyID)

	w.WriteHeader(http.StatusCreated)
}

func (re *PolicyResource) GetPoliciesHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}

	policies := re.db.GetPolicies(serverID)

	res := PoliciesListResponse{Policies: make([]PoliciesResponse, 0, len(policies))}
	for i := range policies {
		res.Policies = append(res.Policies, PoliciesResponse{
			ID:              policies[i].ID,
			MCPServerID:     serverID,
			Policy:          policies[i].Policy,
			LastModified:    time.Now(),
			ModifiedBy:      "some-user@example.com",
			AssignedToCount: re.db.GetAssignmentCount(serverID, policies[i].ID),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(res)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf("error encoding response: %v", err)))
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (re *PolicyResource) GetPolicyHandler(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}
	_ = serverID
}

func (re *PolicyResource) UpdateMCPToolsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// TODO: Implement schema processing logic
	// For now, return a dummy response

	var req MCPInputSchemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")

	response := map[string]interface{}{
		"message": "Schema processed successfully",
		"id":      id,
		"status":  "created",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}
