package githubpolicies

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

const (
	defaultAPIBasePublic     = "https://api.github.com"
	defaultAPIBaseSAPBinding = "https://github.tools.sap/api/v3" // matches srv/server.js when url file missing
)

// bindingRead returns trimmed file contents under dir/name, or "" if missing.
func bindingRead(dir, name string) string {
	p := filepath.Join(dir, name)
	b, err := os.ReadFile(p)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

// credentialsFromBindingFiles mirrors srv/server.js: SERVICE_BINDING_ROOT/github/{token|access_token|password,url|api_url}.
func credentialsFromBindingFiles() (token, apiBase string) {
	root := os.Getenv("SERVICE_BINDING_ROOT")
	if root == "" {
		root = "/bindings"
	}
	ghDir := filepath.Join(root, "github")
	st, err := os.Stat(ghDir)
	if err != nil || !st.IsDir() {
		return "", ""
	}
	token = bindingRead(ghDir, "token")
	if token == "" {
		token = bindingRead(ghDir, "access_token")
	}
	if token == "" {
		token = bindingRead(ghDir, "password")
	}
	if token == "" {
		return "", ""
	}
	apiBase = bindingRead(ghDir, "url")
	if apiBase == "" {
		apiBase = bindingRead(ghDir, "api_url")
	}
	if apiBase == "" {
		apiBase = defaultAPIBaseSAPBinding
	}
	return token, strings.TrimSuffix(apiBase, "/")
}

type vcapCreds struct {
	Token       string `json:"token"`
	AccessToken string `json:"access_token"`
	Password    string `json:"password"`
	URL         string `json:"url"`
	APIURL      string `json:"api_url"`
	URI         string `json:"uri"`
}

type vcapInstance struct {
	Name        string    `json:"name"`
	Label       string    `json:"label"`
	Credentials vcapCreds `json:"credentials"`
}

func tokenFromVcapCreds(c vcapCreds) string {
	if strings.TrimSpace(c.Token) != "" {
		return strings.TrimSpace(c.Token)
	}
	if strings.TrimSpace(c.AccessToken) != "" {
		return strings.TrimSpace(c.AccessToken)
	}
	return strings.TrimSpace(c.Password)
}

func apiBaseFromVcapCreds(c vcapCreds) string {
	for _, v := range []string{c.URL, c.APIURL, c.URI} {
		v = strings.TrimSpace(v)
		if v != "" {
			return strings.TrimSuffix(v, "/")
		}
	}
	return ""
}

func vcapInstanceScore(name, label string) int {
	n := strings.ToLower(name)
	l := strings.ToLower(label)
	want := strings.TrimSpace(os.Getenv("MCP_AMS_VCAP_SERVICE_NAME"))
	if want != "" && name == want {
		return 100
	}
	score := 0
	if strings.Contains(n, "github") || strings.Contains(l, "github") {
		score += 50
	}
	if strings.Contains(n, "git-credentials") || strings.Contains(n, "git_credentials") {
		score += 40
	}
	if strings.Contains(n, "git") {
		score += 10
	}
	return score
}

// credentialsFromVCAP parses VCAP_SERVICES and picks the best GitHub-like binding with a token.
func credentialsFromVCAP() (token, apiBase string) {
	raw := strings.TrimSpace(os.Getenv("VCAP_SERVICES"))
	if raw == "" {
		return "", ""
	}
	var top map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &top); err != nil {
		return "", ""
	}
	bestScore := -1
	for label, msg := range top {
		var instances []vcapInstance
		if err := json.Unmarshal(msg, &instances); err != nil {
			continue
		}
		for _, inst := range instances {
			tok := tokenFromVcapCreds(inst.Credentials)
			if tok == "" {
				continue
			}
			if inst.Label == "" {
				inst.Label = label
			}
			sc := vcapInstanceScore(inst.Name, inst.Label)
			if sc > bestScore {
				bestScore = sc
				token = tok
				apiBase = apiBaseFromVcapCreds(inst.Credentials)
			}
		}
	}
	if token == "" {
		return "", ""
	}
	if apiBase == "" {
		apiBase = defaultAPIBasePublic
	} else {
		apiBase = strings.TrimSuffix(apiBase, "/")
	}
	return token, apiBase
}

// ResolveGitHubTokenAndAPIBase returns credentials for GitHub API calls.
// Precedence:
//  1. MCP_AMS_GITHUB_TOKEN (+ optional MCP_AMS_GITHUB_API_BASE)
//  2. Files under $SERVICE_BINDING_ROOT/github/ (same layout as srv/server.js)
//  3. VCAP_SERVICES (instance scored by name/label; override with MCP_AMS_VCAP_SERVICE_NAME)
func ResolveGitHubTokenAndAPIBase() (token, apiBase string) {
	token = strings.TrimSpace(os.Getenv("MCP_AMS_GITHUB_TOKEN"))
	if token != "" {
		apiBase = strings.TrimSpace(os.Getenv("MCP_AMS_GITHUB_API_BASE"))
		if apiBase == "" {
			apiBase = defaultAPIBasePublic
		}
		return token, strings.TrimSuffix(apiBase, "/")
	}
	if t, u := credentialsFromBindingFiles(); t != "" {
		return t, u
	}
	if t, u := credentialsFromVCAP(); t != "" {
		return t, u
	}
	return "", ""
}
