package githubpolicies

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type contentsResponse struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
}

// FetchPoliciesRaw returns the decoded UTF-8 JSON bytes for agentID/policies.json at ref (branch/tag/sha). ref "" means main.
func (c *Config) FetchPoliciesRaw(agentID, ref string) ([]byte, int, error) {
	if ref == "" {
		ref = "main"
	}
	if agentID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("missing agent id")
	}
	path := agentID + "/policies.json"
	escapedPath := url.PathEscape(path)
	base := c.APIBase
	if base == "" {
		base = "https://api.github.com"
	}
	u := fmt.Sprintf(
		"%s/repos/%s/%s/contents/%s?ref=%s",
		base, c.Owner, c.Repo, escapedPath, url.QueryEscape(ref),
	)
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, fmt.Errorf("github %s: %s", resp.Status, string(body))
	}

	var cr contentsResponse
	if err := json.Unmarshal(body, &cr); err != nil {
		return nil, resp.StatusCode, fmt.Errorf("decode contents json: %w", err)
	}
	if cr.Encoding != "base64" {
		return nil, resp.StatusCode, fmt.Errorf("unexpected encoding %q", cr.Encoding)
	}
	stripped := strings.ReplaceAll(cr.Content, "\n", "")
	raw, err := base64.StdEncoding.DecodeString(stripped)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("base64: %w", err)
	}
	return raw, http.StatusOK, nil
}
