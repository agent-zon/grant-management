#!/usr/bin/env python3
"""
Seed mock data for the grant-management local dev environment.

Generates all CSV files under db/data/ and redeploys to SQLite.

Usage:
    python3 scripts/seed-mock-data.py          # generate CSVs only
    python3 scripts/seed-mock-data.py --deploy  # generate + cds deploy
"""

import csv
import json
import os
import subprocess
import sys


class CdsBoolWriter(csv.DictWriter):
    """csv.DictWriter that writes Python bools as lowercase true/false (CDS convention)."""
    def _dict_to_list(self, rowdict):
        return [
            "true" if v is True else "false" if v is False else v
            for v in super()._dict_to_list(rowdict)
        ]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "db", "data")

# ── Helpers ─────────────────────────────────────────────────────────────────

def ja(*items):
    """JSON array string for CDS CSV columns."""
    return json.dumps(list(items))


def write_csv(filename, fieldnames, rows):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", newline="") as f:
        w = CdsBoolWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote {path} ({len(rows)} rows)")


# ── Grants ──────────────────────────────────────────────────────────────────
# expense-assistant: 7 grants (MCP, DB-read, FS, agent→payment, API, agent→audit, DB-write)
# payment-service:   1 grant  (API)
# audit-service:     2 grants (agent→compliance-bot, DB)
# compliance-bot:    1 grant  (API)

GRANTS = [
    # ── expense-assistant (root agent) ──
    {"id": "g-100", "status": "active", "scope": "mcp:expense",            "subject": "alice"},
    {"id": "g-101", "status": "active", "scope": "db:expense-read",        "subject": "alice"},
    {"id": "g-103", "status": "active", "scope": "fs:receipts",            "subject": "alice"},
    {"id": "g-104", "status": "active", "scope": "agent:payment-service",  "subject": "alice"},
    {"id": "g-105", "status": "active", "scope": "api:expense",            "subject": "alice"},
    {"id": "g-106", "status": "active", "scope": "agent:audit-service",    "subject": "alice"},
    {"id": "g-107", "status": "active", "scope": "db:expense-write",       "subject": "alice"},
    # ── payment-service (2nd layer) ──
    {"id": "g-200", "status": "active", "scope": "api:payment",            "subject": "alice"},
    # ── audit-service (2nd layer) ──
    {"id": "g-300", "status": "active", "scope": "agent:compliance-bot",   "subject": "alice"},
    {"id": "g-301", "status": "active", "scope": "db:audit",               "subject": "alice"},
    # ── compliance-bot (3rd layer) ──
    {"id": "g-400", "status": "active", "scope": "api:compliance",         "subject": "alice"},
]

AGENT_FOR_GRANT = {
    "g-100": "urn:agent:expense-assistant",
    "g-101": "urn:agent:expense-assistant",
    "g-103": "urn:agent:expense-assistant",
    "g-104": "urn:agent:expense-assistant",
    "g-105": "urn:agent:expense-assistant",
    "g-106": "urn:agent:expense-assistant",
    "g-107": "urn:agent:expense-assistant",
    "g-200": "urn:agent:payment-service",
    "g-300": "urn:agent:audit-service",
    "g-301": "urn:agent:audit-service",
    "g-400": "urn:agent:compliance-bot",
}

CLIENT_FOR_AGENT = {
    "urn:agent:expense-assistant": "expense-app",
    "urn:agent:payment-service":   "payment-app",
    "urn:agent:audit-service":     "audit-app",
    "urn:agent:compliance-bot":    "compliance-app",
}

# ── Authorization Details ───────────────────────────────────────────────────
#
# Graph structure for expense-assistant:
#
#   expense-assistant
#   ├── MCP: expense-mcp (register_receipt, scan_receipt)
#   ├── DB:  expense_db.transactions (receipts, cost_centers) — SELECT
#   ├── FS:  /data/receipts/uploads (read, write, list, create)
#   ├── API: expense-api.internal.sap/v2 (GET, POST)
#   ├── DB:  expense_db.transactions (receipts, approvals) — INSERT, UPDATE
#   ├── agent_invocation → payment-service          ← 2-layer
#   │   └── API: reimburse-approve.payments.sap/v1 (approve, disburse)
#   └── agent_invocation → audit-service            ← 3-layer
#       ├── DB: audit_db.compliance (audit_log, violations) — SELECT, INSERT
#       └── agent_invocation → compliance-bot
#           └── API: compliance.governance.sap/v1 (GET, POST)

DETAIL_COLS = [
    "ID", "consent_ID", "consent_grant_id", "type", "server", "transport", "tools",
    "databases", "schemas", "tables", "actions", "roots",
    "permissions_read", "permissions_write", "permissions_execute",
    "permissions_delete", "permissions_list", "permissions_create",
    "urls", "protocols", "identifier",
]

_detail_counter = 0

def detail_id():
    global _detail_counter
    _detail_counter += 1
    n = _detail_counter
    return f"d{n:07d}-{n:04d}-{n:04d}-{n:04d}-{n:012d}"


def build_details(consents):
    """Build the authorization details list. Consent lookup by grant_id."""
    cmap = {c["grant_id"]: c["ID"] for c in consents}

    return [
        # ── expense-assistant ──

        # g-100: MCP expense-mcp
        {"ID": detail_id(), "consent_ID": cmap["g-100"], "consent_grant_id": "g-100",
         "type": "mcp", "server": "expense-mcp", "transport": "stdio",
         "tools": json.dumps({
             "register_receipt": {"essential": True},
             "scan_receipt": {"essential": True},
         })},

        # g-101: DB expense_db (read)
        {"ID": detail_id(), "consent_ID": cmap["g-101"], "consent_grant_id": "g-101",
         "type": "database",
         "databases": ja("expense_db"), "schemas": ja("transactions"),
         "tables": ja("receipts", "cost_centers"), "actions": ja("SELECT")},

        # g-103: FS receipts
        {"ID": detail_id(), "consent_ID": cmap["g-103"], "consent_grant_id": "g-103",
         "type": "fs",
         "roots": ja("/data/receipts/uploads"),
         "permissions_read": True, "permissions_write": True,
         "permissions_execute": False, "permissions_delete": False,
         "permissions_list": True, "permissions_create": True},

        # g-104: agent_invocation → payment-service (2-layer)
        {"ID": detail_id(), "consent_ID": cmap["g-104"], "consent_grant_id": "g-104",
         "type": "agent_invocation",
         "actions": ja("approve-expense"),
         "identifier": "urn:agent:payment-service"},

        # g-105: API expense internal
        {"ID": detail_id(), "consent_ID": cmap["g-105"], "consent_grant_id": "g-105",
         "type": "api",
         "urls": ja("https://expense-api.internal.sap/v2"),
         "protocols": ja("HTTPS"), "actions": ja("GET", "POST")},

        # g-106: agent_invocation → audit-service (3-layer)
        {"ID": detail_id(), "consent_ID": cmap["g-106"], "consent_grant_id": "g-106",
         "type": "agent_invocation",
         "actions": ja("verify-compliance"),
         "identifier": "urn:agent:audit-service"},

        # g-107: DB expense_db (write)
        {"ID": detail_id(), "consent_ID": cmap["g-107"], "consent_grant_id": "g-107",
         "type": "database",
         "databases": ja("expense_db"), "schemas": ja("transactions"),
         "tables": ja("receipts", "approvals"), "actions": ja("INSERT", "UPDATE")},

        # ── payment-service ──

        # g-200: API payment
        {"ID": detail_id(), "consent_ID": cmap["g-200"], "consent_grant_id": "g-200",
         "type": "api",
         "urls": ja("https://reimburse-approve.payments.sap/v1"),
         "protocols": ja("HTTPS"), "actions": ja("approve", "disburse")},

        # ── audit-service ──

        # g-300: agent_invocation → compliance-bot
        {"ID": detail_id(), "consent_ID": cmap["g-300"], "consent_grant_id": "g-300",
         "type": "agent_invocation",
         "actions": ja("check-policy"),
         "identifier": "urn:agent:compliance-bot"},

        # g-301: DB audit
        {"ID": detail_id(), "consent_ID": cmap["g-301"], "consent_grant_id": "g-301",
         "type": "database",
         "databases": ja("audit_db"), "schemas": ja("compliance"),
         "tables": ja("audit_log", "violations"), "actions": ja("SELECT", "INSERT")},

        # ── compliance-bot ──

        # g-400: API compliance
        {"ID": detail_id(), "consent_ID": cmap["g-400"], "consent_grant_id": "g-400",
         "type": "api",
         "urls": ja("https://compliance.governance.sap/v1"),
         "protocols": ja("HTTPS"), "actions": ja("GET", "POST")},
    ]


# ── Finding Rules ───────────────────────────────────────────────────────────

FINDING_RULES = [
    {"ID": "f1a00001-0000-0000-0000-000000000001",
     "code": "sod-expense-approve",
     "label": "Segregation of Duties",
     "description": (
         "This agent can register expense receipts (via direct MCP access) "
         "and approve reimbursements (via delegated access to payment-service). "
         "These capabilities were granted separately \u2014 the agent could register "
         "fraudulent expenses and immediately approve them for payment."
     ),
     "category": "sod", "severity": "high", "active": True},

    {"ID": "f1a00002-0000-0000-0000-000000000002",
     "code": "excessive-db-write",
     "label": "Excessive Database Privilege",
     "description": (
         "Agent has DELETE permission on database tables. Consider restricting "
         "to SELECT/INSERT/UPDATE only unless DELETE is explicitly required "
         "by the workflow."
     ),
     "category": "excessive_privilege", "severity": "medium", "active": True},
]

FINDING_CONDITIONS = [
    # SoD rule: side A = register_receipt tool, side B = approve API (delegated)
    {"ID": "c1a00001-0000-0000-0000-000000000001",
     "rule_ID": "f1a00001-0000-0000-0000-000000000001",
     "side": "A", "leafType": "mcp_tool", "labelPattern": "register_receipt",
     "sublabelPattern": "", "requireDelegated": False, "sourceDetailType": ""},

    {"ID": "c1a00002-0000-0000-0000-000000000002",
     "rule_ID": "f1a00001-0000-0000-0000-000000000001",
     "side": "B", "leafType": "api_endpoint", "labelPattern": "reimburse-approve.payments.sap",
     "sublabelPattern": "", "requireDelegated": True, "sourceDetailType": ""},

    # Excessive privilege rule: DELETE in sublabel
    {"ID": "c1a00003-0000-0000-0000-000000000003",
     "rule_ID": "f1a00002-0000-0000-0000-000000000002",
     "side": "A", "leafType": "db_table", "labelPattern": "",
     "sublabelPattern": "DELETE", "requireDelegated": False, "sourceDetailType": ""},
]


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    print("Generating seed data...")

    # Grants
    write_csv("sap.scai.grants-Grants.csv",
              ["id", "status", "scope", "subject"], GRANTS)

    # Authorization Requests + Consents (derived from grants)
    requests = []
    consents = []
    for i, g in enumerate(GRANTS):
        idx = i + 1
        uid = f"a{idx:07d}-{idx:04d}-{idx:04d}-{idx:04d}-{idx:012d}"
        cid = f"c{idx:07d}-{idx:04d}-{idx:04d}-{idx:04d}-{idx:012d}"
        agent = AGENT_FOR_GRANT[g["id"]]
        risk = "high" if "agent:" in g["scope"] else "medium"
        requests.append({
            "ID": uid, "requested_actor": agent, "grant_id": g["id"],
            "scope": g["scope"], "client_id": CLIENT_FOR_AGENT[agent],
            "status": "used", "risk_level": risk, "subject": "alice",
        })
        consents.append({
            "ID": cid, "grant_id": g["id"], "subject": "alice", "request_ID": uid,
        })

    write_csv("sap.scai.grants-AuthorizationRequests.csv",
              ["ID", "requested_actor", "grant_id", "scope", "client_id", "status", "risk_level", "subject"],
              requests)

    write_csv("sap.scai.grants-Consents.csv",
              ["ID", "grant_id", "subject", "request_ID"], consents)

    # Authorization Details
    details = build_details(consents)
    rows = [{c: d.get(c, "") for c in DETAIL_COLS} for d in details]
    write_csv("sap.scai.grants-AuthorizationDetails.csv", DETAIL_COLS, rows)

    # Finding Rules + Conditions
    write_csv("sap.scai.grants-FindingRules.csv",
              ["ID", "code", "label", "description", "category", "severity", "active"],
              FINDING_RULES)

    write_csv("sap.scai.grants-FindingConditions.csv",
              ["ID", "rule_ID", "side", "leafType", "labelPattern", "sublabelPattern", "requireDelegated", "sourceDetailType"],
              FINDING_CONDITIONS)

    print(f"\nDone. {len(GRANTS)} grants, {len(details)} details, "
          f"{len(FINDING_RULES)} rules, {len(FINDING_CONDITIONS)} conditions.")

    # Deploy if requested
    if "--deploy" in sys.argv:
        print("\nDeploying to SQLite...")
        for f in ["db.sqlite", "db.sqlite-shm", "db.sqlite-wal"]:
            p = os.path.join(ROOT, f)
            if os.path.exists(p):
                os.remove(p)
        subprocess.run(["npx", "cds", "deploy", "--to", "sqlite:db.sqlite"],
                       cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
