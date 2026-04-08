package decision

import (
	"encoding/json"
	"fmt"
	"log"
	"maps"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/expression"

	"mcp-ams/internal/db"
	"mcp-ams/internal/githubpolicies"
)

type DecisionResource struct {
	db     *db.InMemoryDB
	gitCfg *githubpolicies.Config
}

func NewDecisionResource(db *db.InMemoryDB, gitCfg *githubpolicies.Config) *DecisionResource {
	return &DecisionResource{db: db, gitCfg: gitCfg}
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

	versionRef := mux.Vars(r)["versionRef"]
	if versionRef == "" {
		versionRef = "main"
	}
	activePolicy := strings.TrimSpace(r.URL.Query().Get("activePolicy"))

	var polViews []entityPolicyView
	var err error

	if re.gitCfg != nil && re.gitCfg.Enabled() {
		polViews, err = re.policiesFromGit(agentID, versionRef, activePolicy)
	} else {
		polViews, err = re.assignedPolicyViews(agentID, serverID)
	}
	if err != nil {
		if re.gitCfg != nil && re.gitCfg.Enabled() {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(err.Error()))
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Errorf("error getting assignments: %v", err).Error()))
		}
		return
	}

	resMap := map[string]struct{}{}
	for i := range polViews {
		for j := range polViews[i].Policy.Rules {
			rule := &polViews[i].Policy.Rules[j]
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

// entityPolicyView is a minimal view for listing resources from rules.
type entityPolicyView struct {
	Name   string
	Policy dcn.Policy
}

func (re *DecisionResource) assignedPolicyViews(agentID, serverID string) ([]entityPolicyView, error) {
	assigned, err := re.db.GetAssignmentedPolicies(agentID, serverID)
	if err != nil {
		return nil, err
	}
	out := make([]entityPolicyView, 0, len(assigned))
	for i := range assigned {
		out = append(out, entityPolicyView{Name: assigned[i].Name, Policy: assigned[i].Policy})
	}
	return out, nil
}

func (re *DecisionResource) policiesFromGit(agentID, versionRef, activePolicy string) ([]entityPolicyView, error) {
	raw, _, err := re.gitCfg.FetchPoliciesRaw(agentID, versionRef)
	if err != nil {
		return nil, err
	}
	full, err := githubpolicies.ParseAndNormalizeContainer(raw)
	if err != nil {
		return nil, fmt.Errorf("parse dcn: %w", err)
	}
	names, pols, err := githubpolicies.SelectPoliciesForEval(full, activePolicy)
	if err != nil {
		return nil, err
	}
	out := make([]entityPolicyView, len(pols))
	for i := range pols {
		out[i] = entityPolicyView{Name: names[i], Policy: pols[i]}
	}
	return out, nil
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

	versionRef := mux.Vars(r)["versionRef"]
	if versionRef == "" {
		versionRef = "main"
	}

	var payload UsageAuthorizedRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("Error decoding request: %v", err)
		return
	}

	server, err := re.db.GetMCPServer(serverID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Errorf("error getting MCP server: %v", err).Error()))
		return
	}

	dcnContainer := dcn.DcnContainer{}
	dcnContainer.Schemas = append(dcnContainer.Schemas, dcn.Schema{
		QualifiedName: []string{"schema"},
		Tenant:        "",
		Definition:    server.Schema,
		Annotations:   nil,
	})

	var policyNames []string

	if re.gitCfg != nil && re.gitCfg.Enabled() {
		raw, status, ferr := re.gitCfg.FetchPoliciesRaw(agentID, versionRef)
		if ferr != nil {
			code := http.StatusBadGateway
			if status == http.StatusNotFound {
				code = http.StatusNotFound
			}
			w.WriteHeader(code)
			w.Write([]byte(ferr.Error()))
			return
		}
		full, perr := githubpolicies.ParseAndNormalizeContainer(raw)
		if perr != nil {
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte(fmt.Errorf("parse dcn: %v", perr).Error()))
			return
		}
		dcnContainer.Functions = full.Functions
		dcnContainer.Tests = full.Tests

		names, pols, serr := githubpolicies.SelectPoliciesForEval(full, payload.ActivePolicy)
		if serr != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(serr.Error()))
			return
		}
		policyNames = names
		dcnContainer.Policies = pols
	} else {
		policies, aerr := re.db.GetAssignmentedPolicies(agentID, serverID)
		if aerr != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Errorf("error getting assignments: %v", aerr).Error()))
			return
		}
		for i := range policies {
			policyNames = append(policyNames, policies[i].Name)
			dcnContainer.Policies = append(dcnContainer.Policies, policies[i].Policy)
		}
	}

	dcnChan := make(chan dcn.DcnContainer)
	assignmentChan := make(chan dcn.Assignments)
	authzManager := ams.NewAuthorizationManager(dcnChan, assignmentChan, func(err error) {
		log.Printf("Error creating authorization manager: %v", err)
	})
	assignmentChan <- dcn.Assignments{}
	dcnChan <- dcnContainer
	<-authzManager.WhenReady()

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

// Default in-memory MCP server UUID (see api.Server overwriteIDPathParam).
const defaultMCPServerID = "11111111-1111-1111-1111-111111111111"

// openDiscoverySchema allows arbitrary string attributes under $app.tools.* for batch eval without a full MCP JSON schema.
func openDiscoverySchema() dcn.SchemaAttribute {
	wildcardNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: map[string]dcn.SchemaAttribute{},
	}
	for _, metaAttr := range []string{
		"riskLevel", "accessLevel", "dataClassification",
		"category", "environment", "toolName", "enabled",
		"description", "source", "createdBy",
	} {
		wildcardNode.Nested[metaAttr] = dcn.SchemaAttribute{Type: "String"}
	}
	wildcardNode.Nested["*"] = dcn.SchemaAttribute{Type: "String"}

	toolsNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: map[string]dcn.SchemaAttribute{"*": wildcardNode},
	}
	appNode := dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: map[string]dcn.SchemaAttribute{"tools": toolsNode},
	}
	return dcn.SchemaAttribute{
		Type:   "Structure",
		Nested: map[string]dcn.SchemaAttribute{"$app": appNode},
	}
}

// mergeDiscoveryAppInput maps resource meta + tool props into $app.tools.* (not $env — use RunFilterTools env/user args).
func mergeDiscoveryAppInput(app, props map[string]any, toolName string) map[string]any {
	out := make(map[string]any)
	for k, v := range app {
		out[k] = v
	}
	for k, v := range props {
		out[k] = v
	}
	out["toolName"] = toolName
	return out
}

// FilterToolsDiscoveryHandler POST body: inline dcn + env + app + tools[] → one AMS eval pass, returns decisions + grantedTools (filtered discovery).
func (re *DecisionResource) FilterToolsDiscoveryHandler(w http.ResponseWriter, r *http.Request) {
	t0 := time.Now()
	var payload FilterToolsDiscoveryRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("invalid JSON body"))
		return
	}
	tAfterDecode := time.Now()
	if len(payload.Tools) == 0 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(FilterToolsDiscoveryResponse{})
		return
	}
	if len(payload.Dcn) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("missing dcn"))
		return
	}

	full, err := githubpolicies.ParseAndNormalizeContainer(payload.Dcn)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(fmt.Sprintf("parse dcn: %v", err)))
		return
	}
	names, _, serr := githubpolicies.SelectPoliciesForEval(full, payload.ActivePolicy)
	if serr != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(serr.Error()))
		return
	}

	env := payload.Env
	if env == nil {
		env = map[string]any{}
	}
	user := payload.User
	if user == nil {
		user = map[string]any{}
	}
	app := payload.App
	if app == nil {
		app = map[string]any{}
	}

	out, grantedOnly, err := RunFilterTools(re.db, full.Version, full.Functions, full.Schemas, full.Tests, full.Policies, names, env, user, app, payload.Tools)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(err.Error()))
		return
	}
	tAfterReady := time.Now()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(FilterToolsDiscoveryResponse{Tools: out, GrantedTools: grantedOnly}); err != nil {
		log.Printf("Error encoding filter-tools response: %v", err)
		return
	}
	log.Printf(
		"filter-tools decode=%dms ams_init=%dms eval=%dms total=%dms tools=%d",
		tAfterDecode.Sub(t0).Milliseconds(),
		tAfterReady.Sub(tAfterDecode).Milliseconds(),
		time.Since(tAfterReady).Milliseconds(),
		time.Since(t0).Milliseconds(),
		len(payload.Tools),
	)
}
