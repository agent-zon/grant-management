package decision

import (
	"fmt"
	"log"
	"reflect"
	"strings"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/expression"

	"mcp-ams/internal/db"
)

// RunFilterTools runs one AMS pass: allPolicies must be the full DCN policy list (so `uses` / contextual policies resolve); policyNames is which policy(ies) to evaluate.
// env / user are merged into AMS $env / $env.$user (e.g. conditions ref ["$env","grant","privileged_mode"]). app + tool props still map to $app.tools.<tool>.*.
func RunFilterTools(mem *db.InMemoryDB, version int, functions []dcn.Function, schemas []dcn.Schema, tests []dcn.Test, allPolicies []dcn.Policy, policyNames []string, env, user, app map[string]any, tools []ToolIn) ([]ToolOut, []ToolOut, error) {
	if len(tools) == 0 {
		return nil, nil, nil
	}
	if len(policyNames) == 0 {
		return nil, nil, fmt.Errorf("no policies for eval")
	}
	if len(allPolicies) == 0 {
		return nil, nil, fmt.Errorf("no policies in DCN")
	}

	dcnContainer := dcn.DcnContainer{
		Version:   version,
		Policies:  allPolicies,
		Functions: functions,
		Schemas:   schemas,
		Tests:     tests,
	}
	if len(dcnContainer.Schemas) == 0 {
		if server, serr := mem.GetMCPServer(defaultMCPServerID); serr == nil {
			dcnContainer.Schemas = append(dcnContainer.Schemas, dcn.Schema{
				QualifiedName: []string{"schema"},
				Tenant:        "",
				Definition:    server.Schema,
				Annotations:   nil,
			})
		} else {
			dcnContainer.Schemas = append(dcnContainer.Schemas, dcn.Schema{
				QualifiedName: []string{"schema"},
				Tenant:        "",
				Definition:    openDiscoverySchema(),
				Annotations:   nil,
			})
		}
	}
	if env == nil {
		env = map[string]any{}
	}
	if user == nil {
		user = map[string]any{}
	}
	dcnContainer.Schemas = append(append([]dcn.Schema(nil), dcnContainer.Schemas...), runtimeEnvInputSchema(env, user))

	dcnChan := make(chan dcn.DcnContainer)
	assignmentChan := make(chan dcn.Assignments)
	authzManager := ams.NewAuthorizationManager(dcnChan, assignmentChan, func(err error) {
		log.Printf("Error creating authorization manager: %v", err)
	})
	assignmentChan <- dcn.Assignments{}
	dcnChan <- dcnContainer
	<-authzManager.WhenReady()

	authz := authzManager.AuthorizationsForPolicies(policyNames)

	if app == nil {
		app = map[string]any{}
	}

	schema := authzManager.GetSchema()
	out := make([]ToolOut, 0, len(tools))
	var grantedOnly []ToolOut

	for i := range tools {
		tool := &tools[i]
		input := mergeDiscoveryAppInput(app, tool.Props, tool.Name)

		authzInput := expression.Input{}
		for k, v := range input {
			attr := fmt.Sprintf("$app.tools.%s.%s", tool.Name, k)
			authzInput[attr] = expression.ConstantFrom(v)
			wildcardAttr := fmt.Sprintf("$app.tools.*.%s", k)
			authzInput[wildcardAttr] = expression.ConstantFrom(v)
		}
		if len(env) > 0 {
			schema.InsertCustomInput(authzInput, reflect.ValueOf(env), []string{"$env"})
		}
		if len(user) > 0 {
			schema.InsertCustomInput(authzInput, reflect.ValueOf(user), []string{"$env", "$user"})
		}
		schema.PurgeInvalidInput(authzInput)
		authzInput[ams.DCL_ACTION] = expression.String("access")
		authzInput[ams.DCL_RESOURCE] = expression.String(strings.Join([]string{"tools", tool.Name}, "."))

		decision := authz.Evaluate(authzInput)

		granted := decision.IsGranted()
		denied := decision.IsDenied()
		cond := ""
		if !denied && !granted {
			cond = fmt.Sprintf("%s", decision.Condition())
		}

		item := ToolOut{
			Name:        tool.Name,
			Title:       tool.Title,
			Description: tool.Description,
			Granted:     granted,
			Denied:      denied,
			Condition:   cond,
		}
		out = append(out, item)
		if granted && !denied {
			grantedOnly = append(grantedOnly, item)
		}
	}

	return out, grantedOnly, nil
}
