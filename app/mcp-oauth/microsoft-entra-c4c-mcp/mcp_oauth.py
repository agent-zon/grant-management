from fastmcp import FastMCP
from fastmcp.server.auth import OAuthProxy
from fastmcp.server.auth.providers.jwt import JWTVerifier
from fastmcp.server import create_proxy
from starlette.responses import JSONResponse
import os

# Required env vars:
#   OAUTH_CLIENT_ID
#   OAUTH_CLIENT_SECRET
#   OAUTH_AUTHORIZE_ENDPOINT
#   OAUTH_TOKEN_ENDPOINT
#   OAUTH_JWKS_ENDPOINT
#   OAUTH_ISSUER
#   OAUTH_SCOPES  (space-separated)

# Optional: PORT (default 8000), BASE_URL (for OAuth redirect, e.g. https://microsoft-entra-c4c-mcp.<domain>)
PORT = int(os.environ.get("PORT", "8000"))
BASE_URL = os.environ.get("BASE_URL", f"http://localhost:{PORT}")

token_verifier = JWTVerifier(
    jwks_uri=os.environ["OAUTH_JWKS_ENDPOINT"],
)

auth = OAuthProxy(
    upstream_authorization_endpoint=os.environ["OAUTH_AUTHORIZE_ENDPOINT"],
    upstream_token_endpoint=os.environ["OAUTH_TOKEN_ENDPOINT"],
    upstream_client_id=os.environ["OAUTH_CLIENT_ID"],
    upstream_client_secret=os.environ["OAUTH_CLIENT_SECRET"],
    # token_verifier=token_verifier,
    extra_authorize_params={"scope": os.environ["OAUTH_SCOPES"]},
    base_url=BASE_URL,
    # redirect_path stays default: "/auth/callback"
)

mcp = FastMCP("Microsoft OAuth Proxy", auth=auth)

# Health endpoints for Kyma / Kubernetes probes
@mcp.custom_route(path="/health", methods=["GET"])
@mcp.custom_route(path="/healthz", methods=["GET"])
async def health(_request):
    return JSONResponse({"status": "ok"})

external = create_proxy(os.environ["MCP_URL"])
mcp.mount(external)

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=PORT)
