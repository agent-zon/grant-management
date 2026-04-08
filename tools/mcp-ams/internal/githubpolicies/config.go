package githubpolicies

import "os"

// Config holds GitHub API credentials for reading policy DCN from a repo.
type Config struct {
	Token   string
	Owner   string
	Repo    string
	APIBase string // e.g. https://api.github.com or https://github.example.com/api/v3
}

// LoadConfig returns nil when no GitHub token can be resolved (in-memory / assignment mode).
// Token resolution: MCP_AMS_GITHUB_TOKEN → SERVICE_BINDING_ROOT/github files → VCAP_SERVICES.
func LoadConfig() *Config {
	token, apiBase := ResolveGitHubTokenAndAPIBase()
	if token == "" {
		return nil
	}
	owner := os.Getenv("MCP_AMS_POLICIES_OWNER")
	if owner == "" {
		owner = "AIAM"
	}
	repo := os.Getenv("MCP_AMS_POLICIES_REPO")
	if repo == "" {
		repo = "policies"
	}
	if apiBase == "" {
		apiBase = "https://api.github.com"
	}
	return &Config{Token: token, Owner: owner, Repo: repo, APIBase: apiBase}
}

// Enabled is true when Git-backed policy reads are active.
func (c *Config) Enabled() bool {
	return c != nil && c.Token != ""
}
