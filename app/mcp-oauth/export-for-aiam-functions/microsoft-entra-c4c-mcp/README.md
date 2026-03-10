# Microsoft Entra C4C MCP (Kyma Serverless Function)

MCP server that proxies a downstream MCP over HTTP with Microsoft OAuth (OAuth 2.0 / OIDC). Built with [FastMCP](https://gofastmcp.com/). Runs as a Kyma serverless Function (Python 3.12).

## Layout

- `handler.py` — Kyma entry point `main(event, context)`.
- `mcp_oauth.py` — FastMCP app (OAuth proxy + health).
- `requirements.txt` — Pip dependencies for the runtime.
- `.env.example` — Template for env vars (copy to `.env`, do not commit).
- `deploy/` — Kyma manifests and scripts:
  - `function.yaml` — Function CR (source: this repo, folder `microsoft-entra-c4c-mcp`).
  - `apirule.yaml` — APIRule to expose the Function.
  - `create-secret-from-env.sh` — Create Secret from `.env` and optionally apply APIRule.
  - `secret-env.example.yaml` — Example Secret (alternative to the script).

## Run locally

```bash
cp .env.example .env   # edit .env with your values
source .env
pip install -r requirements.txt   # or: uv pip install -r requirements.txt
python mcp_oauth.py
```

Server at `http://localhost:8000`; MCP at `http://localhost:8000/mcp`.

## Deploy to Kyma

### Prerequisites

- Kyma cluster with Serverless module; `kubectl` configured.
- Git secret for cloning this repo: create a Secret named **`github-tools-sap-auth`** in the Function’s namespace with `username` and `password` (or token) for https://github.tools.sap:

  ```bash
  kubectl create secret generic github-tools-sap-auth -n <namespace> \
    --from-literal=username=<your-user> \
    --from-literal=password=<token-or-password>
  ```

### Steps

1. **Secret from .env** (and optionally apply APIRule with same URL as BASE_URL):

   ```bash
   cp .env.example .env
   # edit .env, then:
   chmod +x deploy/create-secret-from-env.sh
   ./deploy/create-secret-from-env.sh <namespace> "https://microsoft-entra-c4c-mcp.<namespace>.<cluster-domain>"
   ```

2. **Deploy Function** (edit `deploy/function.yaml` namespace if needed):

   ```bash
   kubectl apply -f deploy/function.yaml -n <namespace>
   kubectl get function microsoft-entra-c4c-mcp -n <namespace> -w
   ```

3. If you didn’t pass `base_url` in step 1, **apply APIRule** manually (replace `__APIRULE_HOST__` and `__NAMESPACE__` in `deploy/apirule.yaml`), then:

   ```bash
   kubectl apply -f deploy/apirule.yaml -n <namespace>
   ```

4. In Azure AD (App registration → Authentication), add redirect URI:  
   `https://<your-apirule-host>/auth/callback`

## Env vars (Secret `microsoft-entra-c4c-mcp-env`)

| Variable | Purpose |
|----------|---------|
| `OAUTH_CLIENT_ID` | Azure app (client) ID |
| `OAUTH_CLIENT_SECRET` | Azure app client secret |
| `OAUTH_AUTHORIZE_ENDPOINT` | OAuth2 authorize URL |
| `OAUTH_TOKEN_ENDPOINT` | OAuth2 token URL |
| `OAUTH_JWKS_ENDPOINT` | JWKS URL for token verification |
| `OAUTH_ISSUER` | OIDC issuer |
| `OAUTH_SCOPES` | Space-separated scopes (e.g. `openid email profile offline_access User.Read`) |
| `MCP_URL` | Downstream MCP server URL (proxied after OAuth) |
| `BASE_URL` | Public URL of this Function (for OAuth redirect); set via `create-secret-from-env.sh <ns> <base_url>`. |
