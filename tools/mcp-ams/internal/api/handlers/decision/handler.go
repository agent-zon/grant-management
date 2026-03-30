package decision

import (
	"encoding/json"
	"fmt"
	"log"
	"maps"
	"net/http"
	"slices"
	"strings"

	"github.com/gorilla/mux"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/expression"

	"mcp-ams/internal/db"
)

type DecisionResource struct {
	db *db.InMemoryDB
}

func NewDecisionResource(db *db.InMemoryDB) *DecisionResource {
	return &DecisionResource{
		db: db,
	}
}

func (re *DecisionResource) ListAuthorizedToolsHandler(w http.ResponseWriter, r *http.Request) {
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

	policies, err := re.db.GetAssignmentedPolicies(agentID, serverID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Errorf("error getting assignments: %v", err).Error()))
		return
	}

	resMap := map[string]struct{}{}
	for i := range policies {
		for j := range policies[i].Policy.Rules {
			rule := &policies[i].Policy.Rules[j]
			for k := range rule.Resources {
				resMap[rule.Resources[k]] = struct{}{}
			}
		}
	}

	resources := slices.Collect(maps.Keys(resMap))
	if resources == nil {
		resources = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resources); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func (re *DecisionResource) IsUsageAuthorizedHandler(w http.ResponseWriter, r *http.Request) {
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

	dcnContainer := dcn.DcnContainer{}
	server, err := re.db.GetMCPServer(serverID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("error getting MCP server: %v", err).Error()))
		return
	}
	dcnContainer.Schemas = append(dcnContainer.Schemas, dcn.Schema{
		QualifiedName: []string{"schema"},
		Tenant:        "",
		Definition:    server.Schema,
		Annotations:   nil,
	})

	policies, err := re.db.GetAssignmentedPolicies(agentID, serverID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Errorf("error getting assignments: %v", err).Error()))
		return
	}
	var policyNames []string
	for i := range policies {
		policyNames = append(policyNames, policies[i].Name)
		dcnContainer.Policies = append(dcnContainer.Policies, policies[i].Policy)
	}

	dcnChan := make(chan dcn.DcnContainer)
	assignmentChan := make(chan dcn.Assignments)
	authzManager := ams.NewAuthorizationManager(dcnChan, assignmentChan, func(err error) {
		log.Printf("Error creating authorization manager: %v", err)
	})
	assignmentChan <- dcn.Assignments{}
	dcnChan <- dcnContainer
	<-authzManager.WhenReady()

	var payload UsageAuthorizedRequest
	err = json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("Error decoding request: %v", err)
		return
	}

	authz := authzManager.AuthorizationsForPolicies(policyNames)

	authzInput := expression.Input{}
	if payload.Input != nil {
		for k, v := range payload.Input {
			attr := fmt.Sprintf("$app.%s.%s.%s", payload.Primitive, payload.Name, k)
			authzInput[attr] = expression.ConstantFrom(v)
			wildcardAttr := fmt.Sprintf("$app.%s.*.%s", payload.Primitive, k)
			authzInput[wildcardAttr] = expression.ConstantFrom(v)
		}
	}
	authzManager.GetSchema().PurgeInvalidInput(authzInput)
	authzInput[ams.DCL_ACTION] = expression.String("access")
	authzInput[ams.DCL_RESOURCE] = expression.String(strings.Join([]string{payload.Primitive, payload.Name}, "."))

	decision := authz.Evaluate(authzInput)

	resp := UsageAuthorizedResponse{
		Granted: decision.IsGranted(),
		Denied:  decision.IsDenied(),
	}
	if !decision.IsDenied() && !decision.IsGranted() {
		resp.Condition = fmt.Sprintf("%s", decision.Condition())
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}
