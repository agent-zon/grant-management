package decision

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/db"
	"mcp-ams/internal/githubpolicies"
)

// EvalHTTPError is returned by EvaluatePoliciesPost for client errors (maps to HTTP status).
type EvalHTTPError struct {
	Code int
	Msg  string
}

func (e *EvalHTTPError) Error() string { return e.Msg }

func mockToolsGranted(toolIns []ToolIn) ([]ToolOut, []ToolOut) {
	tools := make([]ToolOut, 0, len(toolIns))
	granted := make([]ToolOut, 0, len(toolIns))
	for i := range toolIns {
		t := toolIns[i]
		o := ToolOut{Name: t.Name, Title: t.Title, Description: t.Description, Granted: true, Denied: false}
		tools = append(tools, o)
		granted = append(granted, o)
	}
	return tools, granted
}

func byPolicyMockResults(full dcn.DcnContainer, toolIns []ToolIn) []PolicySliceResult {
	tools, granted := mockToolsGranted(toolIns)
	var out []PolicySliceResult
	for i := range full.Policies {
		name := githubpolicies.PolicyQualifiedName(full.Policies[i])
		// Copy slices so each policy has independent rows (same content for mock).
		tCopy := append([]ToolOut(nil), tools...)
		gCopy := append([]ToolOut(nil), granted...)
		out = append(out, PolicySliceResult{Policy: name, Tools: tCopy, GrantedTools: gCopy, Mock: true})
	}
	return out
}

func loadPoliciesDCN(gitCfg *githubpolicies.Config, agentID, ref string, inline []byte) (dcn.DcnContainer, error) {
	if len(inline) > 0 {
		return githubpolicies.ParseAndNormalizeContainer(inline)
	}
	if gitCfg == nil || !gitCfg.Enabled() {
		return dcn.DcnContainer{}, fmt.Errorf("send policies as \"dcn\" in JSON body (mcp-ams has no Git)")
	}
	raw, _, err := gitCfg.FetchPoliciesRaw(agentID, ref)
	if err != nil {
		return dcn.DcnContainer{}, err
	}
	return githubpolicies.ParseAndNormalizeContainer(raw)
}

func corsPoliciesEvaluate(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// PoliciesRefEvaluateHandler serves GET|POST /policies/{ref}/evaluate — ref = git ref/SHA for policies.json.
// POST body: { agentId, activePolicy?, env?, user?, input: { app?, tools }, dcn? }.
// GET: ?agentId= required; optional real=1 for AMS on active; byPolicy is always mock for speed.
func (re *DecisionResource) PoliciesRefEvaluateHandler(w http.ResponseWriter, r *http.Request) {
	corsPoliciesEvaluate(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	ref, ok := mux.Vars(r)["ref"]
	if !ok || ref == "" {
		http.Error(w, "missing ref", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		re.policiesRefEvaluateGET(w, r, ref)
	case http.MethodPost:
		re.policiesRefEvaluatePOST(w, r, ref)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (re *DecisionResource) policiesRefEvaluateGET(w http.ResponseWriter, r *http.Request, ref string) {
	agentID := r.URL.Query().Get("agentId")
	if agentID == "" {
		http.Error(w, "query agentId is required", http.StatusBadRequest)
		return
	}
	activePolicy := r.URL.Query().Get("activePolicy")
	real := r.URL.Query().Get("real") == "1"

	toolIns := []ToolIn{{Name: "smoke", Title: "Smoke", Description: "GET /policies/{ref}/evaluate probe"}}

	full, err := loadPoliciesDCN(re.gitCfg, agentID, ref, nil)
	if err != nil {
		http.Error(w, "no policies: mcp-ams has no Git — use POST /policies/{ref}/evaluate with \"dcn\" in body, or run scripts/persist-mcp-ams-eval.mjs", http.StatusServiceUnavailable)
		return
	}

	by := byPolicyMockResults(full, toolIns)

	resp := PoliciesRefEvaluateResponse{Ref: ref, AgentID: agentID, ByPolicy: by}

	if !real {
		tools, granted := mockToolsGranted(toolIns)
		resp.Active = PolicySliceResult{Policy: activePolicy, Tools: tools, GrantedTools: granted, Mock: true}
	} else {
		names, _, serr := githubpolicies.SelectPoliciesForEval(full, activePolicy)
		if serr != nil {
			http.Error(w, serr.Error(), http.StatusBadRequest)
			return
		}
		probeEnv := map[string]any{"tid": "get-probe"}
		out, granted, err := RunFilterTools(re.db, full.Version, full.Functions, full.Schemas, full.Tests, full.Policies, names, probeEnv, nil, map[string]any{}, toolIns)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		polName := ""
		if len(names) > 0 {
			polName = names[0]
		}
		resp.Active = PolicySliceResult{Policy: polName, Tools: out, GrantedTools: granted, Mock: false}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// EvaluatePoliciesPost runs the same evaluation as POST /policies/{ref}/evaluate (for HTTP handler and cmd/eval-policies).
func EvaluatePoliciesPost(mem *db.InMemoryDB, gitCfg *githubpolicies.Config, ref string, req *PoliciesRefEvaluateRequest) (PoliciesRefEvaluateResponse, error) {
	if req.AgentID == "" {
		return PoliciesRefEvaluateResponse{}, &EvalHTTPError{Code: http.StatusBadRequest, Msg: "agentId is required"}
	}
	toolIns := req.Input.Tools
	if len(toolIns) == 0 {
		return PoliciesRefEvaluateResponse{Ref: ref, AgentID: req.AgentID, ByPolicy: nil, Active: PolicySliceResult{}}, nil
	}

	full, err := loadPoliciesDCN(gitCfg, req.AgentID, ref, req.Dcn)
	if err != nil {
		return PoliciesRefEvaluateResponse{}, &EvalHTTPError{Code: http.StatusUnprocessableEntity, Msg: err.Error()}
	}

	env := req.Env
	if env == nil {
		env = map[string]any{}
	}
	user := req.User
	if user == nil {
		user = map[string]any{}
	}
	app := req.Input.App
	if app == nil {
		app = map[string]any{}
	}
	var by []PolicySliceResult
	for i := range full.Policies {
		qname := githubpolicies.PolicyQualifiedName(full.Policies[i])
		polEnv := MergeEnvForPolicyQual(qname, env)
		out, granted, rerr := RunFilterTools(mem, full.Version, full.Functions, full.Schemas, full.Tests, full.Policies, []string{qname}, polEnv, user, app, toolIns)
		if rerr != nil {
			by = append(by, PolicySliceResult{Policy: qname, Tools: nil, GrantedTools: nil, Mock: false})
			continue
		}
		by = append(by, PolicySliceResult{Policy: qname, Tools: out, GrantedTools: granted, Mock: false})
	}

	names, _, serr := githubpolicies.SelectPoliciesForEval(full, req.ActivePolicy)
	if serr != nil {
		return PoliciesRefEvaluateResponse{}, &EvalHTTPError{Code: http.StatusBadRequest, Msg: serr.Error()}
	}
	polName := ""
	if len(names) > 0 {
		polName = names[0]
	}
	activeEnv := MergeEnvForPolicyQual(polName, env)
	out, granted, err := RunFilterTools(mem, full.Version, full.Functions, full.Schemas, full.Tests, full.Policies, names, activeEnv, user, app, toolIns)
	if err != nil {
		return PoliciesRefEvaluateResponse{}, err
	}
	active := PolicySliceResult{Policy: polName, Tools: out, GrantedTools: granted, Mock: false}

	return PoliciesRefEvaluateResponse{Ref: ref, AgentID: req.AgentID, ByPolicy: by, Active: active}, nil
}

func (re *DecisionResource) policiesRefEvaluatePOST(w http.ResponseWriter, r *http.Request, ref string) {
	var req PoliciesRefEvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	resp, err := EvaluatePoliciesPost(re.db, re.gitCfg, ref, &req)
	if err != nil {
		var he *EvalHTTPError
		if errors.As(err, &he) {
			http.Error(w, he.Msg, he.Code)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
