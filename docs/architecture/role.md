# Role Propagation (AMS / Enterprise Roles)

Step‑up authorization can produce temporary, contextual **role delegations** in addition to tool‑level grants.

**AMS** is strong at **resource scoping** (for example: region, business unit, system instance). MCP servers can enforce these constraints reliably.

## Examples AMS handles well

* Grant WRITE on systems where `region = EU`
* Grant READ on invoices where `$user.organization = invoice.org`
* Grant WRITE on orders where `price < 500`

These restrictions map naturally to backend enforcement.

However, agents often require **runtime or event‑based context**.

Examples:

* only in the region mentioned in the triggering event
* only for this specific order / workflow / session
* only after explicit approval
* only for the next 10 minutes
* only N invocations

These are **dynamic, per‑execution constraints**, not static role properties.

---

# Consent Flow Example — Inventory Supervision

A business user asks:

> "Supervise inventory and create replenishment orders when stock is low."

## AMS policies defined in the application

These exist regardless of the runtime model:

```
@label: 'Inventory Supervisor'
POLICY InventorySupervisor {
    GRANT create ON replenishmentOrders
      WHERE order.region IS NOT RESTRICTED
        AND order.total IS NOT RESTRICTED;
}

@label: 'Inventory Monitor'
POLICY InventoryMonitor {
    GRANT read ON inventory;
}
```

---

## Case A — Static role (no extra layer needed)

If the business user assigns a static AMS role to the agent (for example `InventorySupervisor`) and this is acceptable long‑term:

* Agent always runs with that role
* AMS enforces backend rules
* No additional grant or step‑up is required

This is effectively:

**agent = application with a role**

---

## Case B — Consent‑based role assignment


Agent detects low inventory but does not yet have permission to create replenishment orders.

Agent asks Inventory Manager:

> "Inventory is running low. Allow me to create replenishment orders for the next 10 minutes?"

Manager approves.


Conceptual result :
* Assign AMS role: `InventorySupervisor`
* Expiry: **10 minutes**
* Scope: **this workflow run**

Agent AMS before approval:
```
 shopping.InventoryMonitor
```
AMS projection after approval:

```
 shopping.InventorySupervisor;
```


---

## Case C — Step‑up consent with restriction (max price)

Agent step‑up prompt:

> "Allow me to create replenishment orders for region US."

User approval with restriction:

> "Approved, but limit each order total to <= 500."

Event:

```
LowStockDetected(region="US", sku="A-123")
```

Conceptual result :

* Grant approved
* Assign AMS role: `InventorySupervisor(region="US")`
* Expiry: **10 minutes**

```
replenishmentOrders.create(total <= 500, region="US")
```

AMS restriction projection:

```
USE shopping.InventorySupervisor
RESTRICT order.region = "US",
         order.total <= 500;
```


---

## Case D — Event‑based delegation

For system/ event triggers access can be restricted by event data

Example conditions:

* only when a `LowStock` event occurs
* only for the region from the event
* only after Inventory Manager approval
* only for 10 minutes
* only up to N orders or a max total amount

Event:

```
LowStockDetected(region="US", sku="A-123", shortage=20)
```

Runtime constraints enforced :

* expiry: **10 minutes**
* maxInvocations: **20**
* workflowBound: **true**

AMS projection after evaluation:

```
USE shopping.InventorySupervisor
RESTRICT order.region = "US";
```

---

