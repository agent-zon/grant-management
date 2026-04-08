// normalize-dcn-policies: stdin = raw policies repo JSON → stdout = normalized policies.json (rule keys, grant/deny).
package main

import (
	"io"
	"os"

	"mcp-ams/internal/githubpolicies"
)

func main() {
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		panic(err)
	}
	c, err := githubpolicies.ParseAndNormalizeContainer(raw)
	if err != nil {
		os.Stderr.WriteString(err.Error() + "\n")
		os.Exit(1)
	}
	// Tool schemas are persisted per resource under dcn/schema/{resource}.json
	c.Schemas = nil
	out, err := githubpolicies.MarshalPoliciesDCNFile(c)
	if err != nil {
		os.Stderr.WriteString(err.Error() + "\n")
		os.Exit(1)
	}
	_, _ = os.Stdout.Write(out)
	_, _ = os.Stdout.Write([]byte("\n"))
}
