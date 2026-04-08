// eval-policies runs POST /policies/{ref}/evaluate logic in-process (no HTTP server).
// Same stdin JSON as the HTTP body: agentId, activePolicy?, env?, user?, input: { app?, tools }, dcn?.
//
//	go run ./cmd/eval-policies -ref main < request.json
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"

	"mcp-ams/internal/api/handlers/decision"
	"mcp-ams/internal/inmem"
)

func main() {
	ref := flag.String("ref", "main", "ref label echoed in JSON output (informational)")
	flag.Parse()

	mem, err := inmem.NewServerDB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "eval-policies: DB init: %v\n", err)
		os.Exit(2)
	}

	var req decision.PoliciesRefEvaluateRequest
	if err := json.NewDecoder(os.Stdin).Decode(&req); err != nil {
		fmt.Fprintf(os.Stderr, "eval-policies: stdin JSON: %v\n", err)
		os.Exit(2)
	}

	resp, err := decision.EvaluatePoliciesPost(mem, nil, *ref, &req)
	if err != nil {
		var he *decision.EvalHTTPError
		if errors.As(err, &he) {
			fmt.Fprintf(os.Stderr, "%s\n", he.Msg)
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(resp); err != nil {
		fmt.Fprintf(os.Stderr, "eval-policies: encode: %v\n", err)
		os.Exit(2)
	}
}
