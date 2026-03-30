package assignment

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"

	"mcp-ams/internal/db"
	"mcp-ams/internal/db/entity"
)

type AssignmentResource struct {
	db *db.InMemoryDB
}

func NewAssignmentResource(db *db.InMemoryDB) *AssignmentResource {
	return &AssignmentResource{
		db: db,
	}
}

func (re *AssignmentResource) CreateAssignmentHandler(w http.ResponseWriter, r *http.Request) {
	agentID := mux.Vars(r)["agentID"]
	if agentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing agent id in path").Error()))
		return
	}

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

	err = re.db.CreateAssignment(agentID, serverID, policyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Errorf("unable to create assignment").Error()))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (re *AssignmentResource) DeleteAssignmentHandler(w http.ResponseWriter, r *http.Request) {
	agentID := mux.Vars(r)["agentID"]
	if agentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing agent id in path").Error()))
		return
	}

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

	err = re.db.DeleteAssignment(agentID, serverID, policyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Errorf("unable to delete assignment").Error()))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (re *AssignmentResource) GetAssignedPoliciesHandler(w http.ResponseWriter, r *http.Request) {
	agentID := mux.Vars(r)["agentID"]
	if agentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing agent id in path").Error()))
		return
	}

	serverID := mux.Vars(r)["serverID"]
	if serverID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("missing server id in path").Error()))
		return
	}

	assignments, err := re.db.GetAssignments(agentID, serverID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Errorf("failed to get assignments: %v", err).Error()))
		return
	}

	policies := re.db.GetPolicies(serverID)
	policyMap := make(map[uuid.UUID]entity.Policy, len(policies))
	for i := range policies {
		policyMap[policies[i].ID] = policies[i]
	}

	res := AssignedPoliciesResponse{
		Policies: make([]AssignedPolicy, 0, len(assignments)),
	}
	for i := range assignments {
		p, ok := policyMap[assignments[i].PolicyID]
		if !ok {
			log.Printf("warning: assignment with unknown policy id %s", assignments[i].PolicyID)
			continue
		}
		res.Policies = append(res.Policies, AssignedPolicy{
			ID:           p.ID,
			Name:         p.Name,
			Policy:       p.Policy,
			LastModified: time.Now(),
			ModifiedBy:   "some-user@example.com",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(res); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}
