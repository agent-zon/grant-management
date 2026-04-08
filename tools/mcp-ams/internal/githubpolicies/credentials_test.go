package githubpolicies

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCredentialsFromBindingFiles(t *testing.T) {
	dir := t.TempDir()
	gh := filepath.Join(dir, "github")
	if err := os.MkdirAll(gh, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gh, "token"), []byte("tok-bind\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gh, "url"), []byte("https://ghe.example.com/api/v3\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("SERVICE_BINDING_ROOT", dir)
	t.Setenv("MCP_AMS_GITHUB_TOKEN", "")
	t.Setenv("VCAP_SERVICES", "")

	token, base := credentialsFromBindingFiles()
	if token != "tok-bind" || base != "https://ghe.example.com/api/v3" {
		t.Fatalf("got %q %q", token, base)
	}
}

func TestCredentialsFromBindingFiles_DefaultURL(t *testing.T) {
	dir := t.TempDir()
	gh := filepath.Join(dir, "github")
	if err := os.MkdirAll(gh, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gh, "access_token"), []byte("atok"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("SERVICE_BINDING_ROOT", dir)
	t.Setenv("MCP_AMS_GITHUB_TOKEN", "")
	t.Setenv("VCAP_SERVICES", "")

	token, base := credentialsFromBindingFiles()
	if token != "atok" || base != defaultAPIBaseSAPBinding {
		t.Fatalf("got %q %q want default SAP api base", token, base)
	}
}

func TestCredentialsFromVCAP(t *testing.T) {
	vcap := `{
		"user-provided": [
			{ "name": "other", "credentials": { "token": "x" } },
			{ "name": "git-credentials", "credentials": { "token": "good", "url": "https://github.tools.sap/api/v3" } }
		]
	}`
	t.Setenv("VCAP_SERVICES", vcap)
	t.Setenv("MCP_AMS_GITHUB_TOKEN", "")
	t.Setenv("SERVICE_BINDING_ROOT", filepath.Join(t.TempDir(), "none"))

	token, base := credentialsFromVCAP()
	if token != "good" || base != "https://github.tools.sap/api/v3" {
		t.Fatalf("got %q %q", token, base)
	}
}

func TestResolveGitHubTokenAndAPIBase_EnvWins(t *testing.T) {
	t.Setenv("MCP_AMS_GITHUB_TOKEN", "envtok")
	t.Setenv("MCP_AMS_GITHUB_API_BASE", "https://api.github.com")
	t.Setenv("VCAP_SERVICES", `{"x":[{"name":"git-credentials","credentials":{"token":"vcap"}}]}`)

	token, base := ResolveGitHubTokenAndAPIBase()
	if token != "envtok" || base != "https://api.github.com" {
		t.Fatalf("got %q %q", token, base)
	}
}

func TestResolveGitHubTokenAndAPIBase_VCAPServiceName(t *testing.T) {
	t.Setenv("MCP_AMS_GITHUB_TOKEN", "")
	t.Setenv("SERVICE_BINDING_ROOT", filepath.Join(t.TempDir(), "missing"))
	t.Setenv("MCP_AMS_VCAP_SERVICE_NAME", "my-git")
	t.Setenv("VCAP_SERVICES", `{
		"github": [
			{ "name": "low-score", "credentials": { "token": "wrong" } },
			{ "name": "my-git", "credentials": { "token": "right", "url": "https://api.github.com" } }
		]
	}`)

	token, base := ResolveGitHubTokenAndAPIBase()
	if token != "right" {
		t.Fatalf("token %q", token)
	}
	if base != "https://api.github.com" {
		t.Fatalf("base %q", base)
	}
}
