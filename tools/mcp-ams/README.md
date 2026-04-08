# AMS support for AIAM

PoC HTTP service that exposes SAP AMS-style authorization checks for MCP tools.

## Persistence

- MCP tool **schema** in the HTTP process is still the embedded example (`main.go`); **inline `dcn`** on evaluate can carry per-resource schemas from Git.
- **`scripts/persist-mcp-ams-eval.mjs`** (Octokit + `cds bind`):
  1. **`go run ./cmd/normalize-dcn-policies`** → **`{agent}/dcn/policies.json`** (normalized rules with `rule: grant|deny`; tool schemas stripped).
  2. Per **`{agent}/mcps/*.yaml`**: **`go run ./cmd/mcp-to-dcn-schema`** → **`{agent}/dcn/schema/{resourceSlug}.json`**.
  3. Merges normalized policies + that resource’s schema → AMS eval (**`USE_GO_EVAL=1`** uses `go run ./cmd/eval-policies`; else HTTP **`POST /policies/{ref}/evaluate`**).
  4. Writes **`{agent}/eval/{policySlug}.json`** (one file per policy, `resources[resourceName].tools`). CAP reads the same path for the tools panel (`activePolicy` → slug).

### CLI tools (stdin → stdout)

| Command | Input | Output |
| -------- | ----- | ------ |
| `go run ./cmd/normalize-dcn-policies` | raw `policies.json` | normalized policies DCN JSON |
| `go run ./cmd/mcp-to-dcn-schema` | `{"tools":[...]}` | DCN container with `schemas` only |
| `go run ./cmd/eval-policies -ref main` | POST evaluate body JSON | evaluate response JSON |

### In-process eval (no HTTP)

```bash
cd tools/mcp-ams && go run ./cmd/eval-policies -ref main < request.json
```

From repo root (with Git binding, same as persist):

```bash
npm run persist:mcp-ams-eval:go -- --ref main
# or single resource:
USE_GO_EVAL=1 npx cds bind --profile hybrid --exec -- npm run persist:mcp-ams-eval -- --ref main --resource ariba-mcp
```

### Restarting the HTTP server

If you use HTTP eval, restart AMS after pulling Go changes (otherwise an old `go run` keeps serving):

```bash
# macOS: stop listener on 8687, then start again
lsof -nP -iTCP:8687 -sTCP:LISTEN
kill <pid>   # then: npm run hybrid:mcp-ams
```

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `PORT` | Listen port (default `8687`). |

`MCP_AMS_GITHUB_*` is **unused** by the current binary (`main` passes `nil` Git config). Optional: run `npm run hybrid:mcp-ams` without a Git binding — AMS still serves evaluate/filter-tools with inline DCN.

## Run

```bash
cd tools/mcp-ams && go run .
```

Or from repo root (Git token optional):

```bash
npm run hybrid:mcp-ams
```

## HTTP API (excerpt)

- **`POST /policies/{ref}/evaluate`** — body `{ "agentId", "activePolicy"?, "env"?, "user"?, "input": { "app"?, "tools"[] }, "dcn": <policies.json object> }`. Returns `byPolicy[]` and `active` with AMS tool decisions. Path `ref` is informational when `dcn` is set. Request **`env`** is injected as **`$env.*`** (nested maps supported, e.g. `grant.privileged_mode` → ref `["$env","grant","privileged_mode"]` in rule **`condition`**). **`user`** maps to **`$env.$user.*`**.
- **OBO context:** For policies named **`obo_authenticated_user`** or **`obo_*`**, eval automatically sets **`$env.actas.on_behalf_of_user`** = **`true`** for that policy’s pass (so rules can `eq` that ref). Other policies do not get that flag unless you set **`env.actas`** yourself.
- **`POST /sap/scai/v1/authz/decision/filter-tools`** — inline `dcn` + `tools[]` batch eval.
- **`POST …/decision/useTool`** — uses in-memory assignments (or legacy Git branches in code remain off when Git is disabled).
- **`GET /health`** — liveness.

## Node policies-service (Git-only)

CAP reads **`{agentId}/policies.json`** and tool decisions from **`{agentId}/eval/{policySlug}.json`** (`resources[resourceName].tools`; `policySlug` = dotted qualified name with `/` → `_`) via Octokit only (no HTTP to mcp-ams). Demo data: **`npm run seed:eval-per-policy`**.

Refresh eval artifacts:

- **Recommended (no AMS terminal):** `USE_GO_EVAL=1 npx cds bind --profile hybrid --exec -- npm run persist:mcp-ams-eval -- --ref main`  
- **Or** Terminal A: `npm run hybrid:mcp-ams`, Terminal B: same without `USE_GO_EVAL=1`.  
  Git binding required for persist (read/write); `PERSIST_EVAL_ENV` / `--env-json` for `$env.grant.*` in DCN.
