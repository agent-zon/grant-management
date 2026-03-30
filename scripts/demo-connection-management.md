# Connection Management Demo Script

**App URL:** [https://connection-managment-sdyz.bolt.host/](https://connection-managment-sdyz.bolt.host/)  
**Created:** 2026-03-17  
**Purpose:** Live demo walkthrough of the SAP Lobby - Smart Workspace (Connection Management) app

---

## Overview

The Connection Management app is an **SAP Lobby - Smart Workspace** hosted on SAP Build (Bolt). It enables **Intent Development** — connecting AI agents to backend systems (e.g. SAP S/4HANA) and managing those connections.

---

## Pre-Demo Checklist

- [ ] Open the app in a browser: https://connection-managment-sdyz.bolt.host/
- [ ] If a password prompt appears, enter any string (e.g. `demo`, `test123`) — demo systems accept placeholder credentials
- [ ] Ensure a stable network connection
- [ ] Recommended: Use Chrome or Edge for best SAP Build compatibility

---

## Environment & Systems Flow (Key Finding)

### Add Environment
1. In the **SAP Integrations** sidebar (right), click **Connect Environment**.
2. Modal opens: **Connect New Environment** → **Select Environment**.
3. Available environments:
   - **Demo System** (playground) — SAP Task Center, SAP Build Workzone, SAP S/4HANA
   - **Northwind Industries** (Production) — Task Center, S/4HANA, Concur, SuccessFactors, Build Workzone
   - **Northwind Industries** (Test) — same systems as Production
4. Select one → **Continue**.

### Select Systems
- The sidebar shows connected systems with toggle switches (SAP Task Center, SAP Build Workzone, SAP S/4HANA).
- Enable/disable systems to control which appear in **smart suggestions**.

### Smart Suggestions
- Main area has a **"Message SAP Build Studio..."** input and the note: *"SAP Build Studio uses AI, make sure to review the code suggested."*
- **Continue your work** shows intent cards (e.g. Review Open Purchase Orders — SAP S/4HANA Demo).
- Smart suggestions and intent cards update based on selected systems/environments.

---

## Demo Flow (15–20 min)

### 1. Landing Page & Overview (2 min)

**What to show**

- **Lobby** branding and “Intent Development” heading
- **3 Connected** — number of active agent–system connections
- **Continue your work** — existing intents and tasks

**Script**

> "This is the SAP Lobby Smart Workspace. It manages connections between AI agents and backend systems. We can see three connected systems and a list of intents we can work with."

---

### 2. Intent Cards (3 min)

**What to show**

- **Review Open Purchase Orders** intent card
- **SAP S/4HANA(Demo)** label — backend system
- Description: *"Audit outstanding purchase orders, flag overdue items, and generate a cleanup report."*

**Script**

> "Here we have an intent that connects to SAP S/4HANA. When an agent runs it, it can audit purchase orders, flag overdue items, and generate cleanup reports. The connection is already established and ready to use."

---

### 3. Adding a New Connection (5 min)

**Steps**

1. Click to add a new connection or open the Intent Development area
2. If prompted for a destination or system:
   - Select **SAP S/4HANA (Demo)** or equivalent
   - If a **password** prompt appears: enter any string (e.g. `demo`, `password`)
3. Complete the connection flow; the new connection should appear under **Connected**

**Script**

> "To add another system, we go through the Intent Development flow. If the system asks for credentials, the demo accepts placeholder values. Once connected, the agent can use tools backed by this system."

---

### 4. AI & Code Review Notice (1 min)

**What to point out**

- “SAP Build Studio uses AI, make sure to review the code suggested”

**Script**

> "The app uses AI to help build intents and connections. As with any AI-assisted development, it’s important to review suggested code before deploying."

---

### 5. Integration with Grant Management (5 min)

**When demoing in the full grant-management setup**

The Connection Management app can be reached via the grant-management app router:

- **Sketch route:** `/sketch/connection-managment` → proxies to the external app
- **Destination:** `connection-managment` (configured in `chart/values.yaml`, `default-env.json`)

**Script**

> "In our grant-management setup, this app is wired as a destination. When users access it through the app router, they can manage connections without leaving the main platform. Policies for agents are managed separately under Policy Management."

**Related entry points**

- **Policy Management:** `/policies` — ODRL policies for agents
- **Grants:** `/grants` — OAuth 2.0 grant lifecycle

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Blank page | Refresh; check network; try incognito |
| Password prompt | Enter any string (e.g. `demo`, `test`) |
| Slow load | Typical for SAP Build; allow a few seconds |
| CORS / API errors | Ensure you’re using the official URL; avoid localhost if proxying |

---

## Key URLs

| Purpose | URL |
|---------|-----|
| Standalone Connection Management | https://connection-managment-sdyz.bolt.host/ |
| Via Grant Management (when deployed) | `{grant-host}/sketch/connection-managment` |
| Policies (Grant Management) | `{grant-host}/policies` |
| API Docs (Grant Management) | `{grant-host}/api-docs` |

---

## Configuration Reference

Connection management destination in this project:

- **`app/router/default-env.json`** — local approuter
- **`chart/values.yaml`** — BTP deployment (connection-managment, external)

```yaml
connection-managment:
  external: true
  name: connection-managment
  url: https://connection-managment-sdyz.bolt.host
```
