package db

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/db/entity"
)

type InMemoryDB struct {
	McpServers  map[string]entity.Instance     // serverID -> instance
	Policies    map[string][]entity.Policy     // serverID -> policies
	Assignments map[string][]entity.Assignment // agentID -> assignments
}

func NewInMemoryDB() *InMemoryDB {
	return &InMemoryDB{
		McpServers:  make(map[string]entity.Instance),
		Policies:    make(map[string][]entity.Policy),
		Assignments: make(map[string][]entity.Assignment),
	}
}

func (d *InMemoryDB) GetMCPServers() []entity.Instance {
	var res []entity.Instance
	for i := range d.McpServers {
		res = append(res, d.McpServers[i])
	}
	return res
}
func (d *InMemoryDB) GetMCPServer(id string) (*entity.Instance, error) {
	instance, ok := d.McpServers[id]
	if !ok {
		return nil, fmt.Errorf("server does not exiyst")
	}
	return &instance, nil
}

func (d *InMemoryDB) UpdateSchema(serverID string, schema dcn.SchemaAttribute) error {
	server, ok := d.McpServers[serverID]
	if !ok {
		return fmt.Errorf("server not found")
	}
	server.Schema = schema

	return nil
}

func (d *InMemoryDB) GetPolicies(serverID string) []entity.Policy {
	return d.Policies[serverID]
}

func (d *InMemoryDB) AddPolicy(serverID string, policy entity.Policy) {
	d.Policies[serverID] = append(d.Policies[serverID], policy)
}

func (d *InMemoryDB) DeletePolicy(serverID string, policyID uuid.UUID) error {
	policies, ok := d.Policies[serverID]
	if !ok {
		return fmt.Errorf("server not found")
	}
	for i := range policies {
		if policies[i].ID == policyID {
			d.Policies[serverID] = append(policies[:i], policies[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("policy not found")
}

func (d *InMemoryDB) GetAssignments(agentID, serverID string) ([]entity.Assignment, error) {
	assignments := d.Assignments[agentID]
	if assignments == nil {
		return []entity.Assignment{}, nil
	}

	var res []entity.Assignment
	for i := range assignments {
		if assignments[i].MCPServerID == serverID {
			res = append(res, assignments[i])
		}
	}
	return res, nil
}

func (d *InMemoryDB) GetAssignmentedPolicies(agentID, serverID string) ([]entity.Policy, error) {
	assignments, err := d.GetAssignments(agentID, serverID)
	if err != nil {
		return nil, err
	}

	if len(assignments) == 0 {
		return []entity.Policy{}, nil
	}

	allPolicies := d.GetPolicies(serverID)
	allPoliciesMap := map[uuid.UUID]entity.Policy{}
	for i := range allPolicies {
		allPoliciesMap[allPolicies[i].ID] = allPolicies[i]
	}
	var res []entity.Policy
	for i := range assignments {
		policy, ok := allPoliciesMap[assignments[i].PolicyID]
		if !ok {
			continue
		}
		res = append(res, policy)
	}

	return res, nil
}

func (d *InMemoryDB) CreateAssignment(agentID, serverID string, policyID uuid.UUID) error {
	d.Assignments[agentID] = append(d.Assignments[agentID], entity.Assignment{
		ID:          uuid.New(),
		AgentID:     agentID,
		MCPServerID: serverID,
		PolicyID:    policyID,
	})
	return nil
}

func (d *InMemoryDB) DeleteAssignment(agentID, serverID string, policyID uuid.UUID) error {
	assignments := d.Assignments[agentID]
	if assignments == nil {
		return nil // nothing to delete
	}
	for i := range assignments {
		if assignments[i].MCPServerID == serverID && assignments[i].PolicyID == policyID {
			d.Assignments[agentID] = append(assignments[:i], assignments[i+1:]...)
			return nil
		}
	}

	return nil
}

func (d *InMemoryDB) GetAssignmentCount(serverID string, policyID uuid.UUID) int {
	count := 0

	for _, assignments := range d.Assignments {
		for i := range assignments {
			if assignments[i].MCPServerID == serverID && assignments[i].PolicyID == policyID {
				count++
			}
		}
	}

	return count
}
