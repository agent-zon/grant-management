# Microsoft OAuth Proxy (FastMCP)

MCP server that proxies a downstream MCP over HTTP with Microsoft OAuth (OAuth 2.0 / OIDC). Built with [FastMCP](https://gofastmcp.com/).

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package runner) or pip
- Python 3.12+
- Dependencies: `pyproject.toml` (local with uv) or `requirements.txt` (Kyma / pip)

## Setup

1. **Environment**

   Copy the sample env and fill in your values (do not commit `.env`):

   ```bash
   cp .env.example .env
   # Edit .env with your Azure app (client id/secret), JWKS/issuer, and optional MCP_URL.
   ```

   Then load it in your shell:

   ```bash
   source .env
   ```

2. **Redirect URI**

   In Azure AD (App registration → Authentication), add redirect URI:

   - Local: `http://localhost:8000/auth/callback`
   - Kyma: `https://<your-apirule-host>/auth/callback`

## Run the server locally

From this directory (or repo root with `uv`):

```bash
source .env
uv run python mcp_oauth.py
# or: uv run fastmcp run mcp_oauth.py --transport http --port 8000
```

Server will be at `http://localhost:8000`. The MCP HTTP endpoint is typically at `http://localhost:8000/mcp`.

## Test with FastMCP CLI

With the server running in one terminal, in another:

**List tools**

```bash
source .env   # if needed
uv run fastmcp list http://localhost:8000/mcp
```

**Call a tool**

```bash
uv run fastmcp call http://localhost:8000/mcp <tool_name> arg1=value1
```

Example (if your proxy exposes a tool named `connect_system`):

```bash
uv run fastmcp call http://localhost:8000/mcp connect_system system_name=microsoft
```

For OAuth-protected endpoints, the FastMCP client may open a browser for login when you first list or call; see [FastMCP OAuth client docs](https://gofastmcp.com/clients/auth/oauth).

## Env vars (required for `main.py`)

| Variable | Purpose |
|----------|---------|
| `OAUTH_CLIENT_ID` | Azure app (client) ID |
| `OAUTH_CLIENT_SECRET` | Azure app client secret |
| `OAUTH_AUTHORIZE_ENDPOINT` | OAuth2 authorize URL (e.g. Microsoft tenant) |
| `OAUTH_TOKEN_ENDPOINT` | OAuth2 token URL |
| `OAUTH_JWKS_ENDPOINT` | JWKS URL for token verification |
| `OAUTH_ISSUER` | OIDC issuer |
| `OAUTH_SCOPES` | Space-separated scopes (e.g. `openid email profile offline_access User.Read`) |
| `MCP_URL` | Downstream MCP server URL (proxied after OAuth) |

Optional: `FASTMCP_OAUTH_ENCRYPTION_KEY`, `BASE_URL` (for OAuth redirect in Kyma).

## Deploy to Kyma (serverless Function)

This app is deployable as a [Kyma serverless Function](https://kyma-project.io/external-content/serverless/docs/user/00-10-from-code-to-function.html) (no Dockerfile). The runtime uses `handler.py` as the entry point (`main(event, context)`) and forwards each HTTP request to the FastMCP ASGI app.

### Prerequisites

- Kyma cluster with the [Serverless module](https://kyma-project.io/external-content/serverless/docs/user/00-20-configure-serverless.html) enabled
- `kubectl` configured for your cluster

### Steps

1. **Create the env Secret and APIRule from your `.env` and one base URL** (recommended):

   From `app/mcp-oauth`, run the script with your namespace and the **APIRule URL** (the public URL where the Function will be exposed). That same URL is used as `BASE_URL` in the Function and as the APIRule host, so one value drives both:

   ```bash
   cd app/mcp-oauth
   chmod +x deploy/create-secret-from-env.sh
   ./deploy/create-secret-from-env.sh <namespace> "https://microsoft-entra-c4c-mcp.<namespace>.<cluster-domain>"
   ```

   This (1) reads `.env`, (2) sets `BASE_URL` in the Secret to that URL, (3) creates/updates the `microsoft-entra-c4c-mcp-env` Secret, and (4) applies the APIRule with the host extracted from the URL. Ensure `.env` exists (copy from `.env.example` and fill in).

   Alternatively, create the Secret manually from the [example YAML](deploy/secret-env.example.yaml), set `BASE_URL` there, and apply [apirule.yaml](deploy/apirule.yaml) after replacing `__APIRULE_HOST__` and `__NAMESPACE__`.

2. **Edit `deploy/function.yaml`** (if needed):

   - Source is **https://github.tools.sap/AIAM/functions**, folder **microsoft-entra-c4c-mcp**. To use a different branch, set `spec.source.gitRepository.reference`.
   - Git auth uses Secret **`github-tools-sap-auth`** in the same namespace; create it if missing (see [deploy/README-AIAM-functions.md](deploy/README-AIAM-functions.md)).
   - Set `metadata.namespace` if it differs from `default`.

3. **Deploy the Function**:

   ```bash
   kubectl apply -f deploy/function.yaml -n <namespace>
   kubectl get function microsoft-entra-c4c-mcp -n <namespace> -w   # wait until ready
   ```

4. **Expose the Function** (APIRule):

   If you used the script with a base URL (step 1), the APIRule was already applied with that host. Otherwise, replace `__APIRULE_HOST__` and `__NAMESPACE__` in `deploy/apirule.yaml`, then:

   ```bash
   kubectl apply -f deploy/apirule.yaml -n <namespace>
   ```

5. **Azure redirect URI**: In Azure AD (App registration → Authentication), add:

   `https://<your-apirule-host>/auth/callback`

### Deploy layout

- `handler.py` — Kyma entry point: `main(event, context)`; bridges Bottle request to FastMCP.
- `mcp_oauth.py` — FastMCP app (OAuth proxy + health routes).
- `requirements.txt` — Pip deps for the Kyma Python runtime.
- `deploy/function.yaml` — Function CR (gitRepository source, runtime python312).
- `deploy/apirule.yaml` — APIRule to expose the Function.
- `deploy/secret-env.example.yaml` — Example Secret (optional; prefer `create-secret-from-env.sh` from `.env`).
- `deploy/create-secret-from-env.sh` — Creates `microsoft-entra-c4c-mcp-env` Secret from `.env` (+ optional `BASE_URL`).

## Push to AIAM/functions (git subtree)

From the **agent-grants repo root**, after committing any changes under `app/mcp-oauth`:

```bash
./app/mcp-oauth/push-subtree.sh
```

Adds remote `aiam-functions` → `https://github.tools.sap/AIAM/functions.git` if missing, and pushes the subtree. Optional: `./app/mcp-oauth/push-subtree.sh <remote-name> <branch>`.

## Layout

- `mcp_oauth.py` — FastMCP app with `OAuthProxy` and a proxy to `MCP_URL`.
- `handler.py` — Kyma serverless entry (`main(event, context)`).
- `microsoft-entra-c4c-mcp/` — Copy of function code + deploy for the AIAM/functions repo (subtree push).
- `push-subtree.sh` — Push this folder to AIAM/functions via git subtree.
- `.env` — Local env (do not commit). Use `.env.example` as a template.
