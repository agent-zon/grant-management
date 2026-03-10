# Push to https://github.tools.sap/AIAM/functions (git subtree)

From the **agent-grants repo root**:

```bash
cd /path/to/agent-grants
chmod +x app/mcp-oauth/export-for-aiam-functions/push-subtree.sh
./app/mcp-oauth/export-for-aiam-functions/push-subtree.sh
```

This adds remote `aiam-functions` → `https://github.tools.sap/AIAM/functions.git` (if missing) and runs `git subtree push --prefix=app/mcp-oauth/export-for-aiam-functions aiam-functions main`. The remote `main` branch gets **microsoft-entra-c4c-mcp/** at root.

**Optional:** `./push-subtree.sh <remote-name> <branch>` (default: `aiam-functions`, `main`).

---

## Resulting layout in AIAM/functions

```
AIAM/functions/
  microsoft-entra-c4c-mcp/
    handler.py
    mcp_oauth.py
    requirements.txt
    README.md
    .env.example
    deploy/
      function.yaml
      apirule.yaml
      create-secret-from-env.sh
      secret-env.example.yaml
```

Deploy from that repo using `microsoft-entra-c4c-mcp/README.md` (create secret from .env, apply function.yaml and apirule; ensure K8s secret `github-tools-sap-auth` exists for Git clone).
