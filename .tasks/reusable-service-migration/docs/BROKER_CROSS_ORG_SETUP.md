# Making Grant Management Service Broker Available Across Organizations

## Overview

To make the Grant Management service broker available in consumer subaccounts/orgs, you need to register it using **Service Manager (`smctl`)**. This is the standard approach for SAP BTP reusable services.

**Note:** The broker uses **IAS (Identity Authentication Service)** for authentication, not XSUAA. The IAS configuration is already set up in `mta.yaml` with `xsuaa-cross-consumption: true` to support cross-consumption scenarios.

## Prerequisites

1. **SAP BTP CLI (`btp`)** installed (smctl is deprecated)
2. Access to both provider and consumer subaccounts
3. Broker credentials from `mta.yaml`:
   - Username: `broker-username`
   - Password: `broker-password`

## Step 1: Install SAP BTP CLI

If `btp` CLI is not installed, download it from:

- **SAP Development Tools**: https://tools.hana.ondemand.com/#cloud
- Select "SAP BTP command line interface (btp CLI)"

**Note:** `smctl` (Service Manager CLI) is deprecated and will be archived on September 30, 2025. Use `btp` CLI instead.

For macOS:

```bash
# Download and install btp CLI
# Follow instructions from SAP Development Tools page
```

## Step 2: Get Broker Information

From the **provider subaccount** (where broker is deployed):

```bash
# Switch to provider subaccount
cf target -o scai -s grants

# Get broker URL
cf apps | grep grant-management-broker
```

**Broker URL:** `https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com`

**Broker Credentials** (from `mta.yaml`):

- Username: `broker-username`
- Password: `broker-password`

## Step 3: Register Broker in Consumer Subaccount

### 3.1 Login to SAP BTP

Login to SAP BTP using the `btp` CLI:

```bash
btp login
```

Follow the prompts to authenticate with your SAP BTP credentials.

### 3.2 Get Consumer Subaccount ID

Get the subaccount ID where you want to register the broker:

```bash
# List all subaccounts
btp list accounts/subaccount

# Or get details of a specific subaccount
btp get accounts/subaccount --subaccount <subaccount-id>
```

### 3.3 Register the Broker

Register the broker in the consumer subaccount using `btp` CLI:

```bash
btp register services/broker \
  --subaccount <subaccount-id> \
  --name grant-management-broker \
  --url https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com \
  --user broker-username \
  --password broker-password \
  --use-sm-tls true \
  --description "Grant Management OAuth 2.0 Server - Reusable Service"
```

**Parameters:**

- `--subaccount`: Consumer subaccount ID
- `--name`: Unique broker name (alphanumeric and hyphens only)
- `--url`: Broker URL from provider subaccount
- `--user` / `--password`: Broker credentials from `mta.yaml`
- `--use-sm-tls`: Use Service Manager provided mTLS (recommended for security)
- `--description`: Optional description

**Security Note:** The `--use-sm-tls` flag enables Service Manager to automatically manage and rotate mTLS certificates, providing defense-in-depth security when combined with basic authentication.

## Step 4: Verify Broker Registration

### 4.1 Check Registered Brokers

```bash
btp list services/broker --subaccount <subaccount-id> | grep grant-management
```

### 4.2 Verify Service in Marketplace

Switch to the consumer subaccount and check marketplace:

```bash
cf target -o mcp -s dev
cf marketplace | grep grant-management
```

You should see:

```
grant-management-service   standard   ...
```

## Step 5: Create Service Instance in Consumer Subaccount

Now you can create service instances in the consumer subaccount:

```bash
cf create-service grant-management-service standard test-instance
```

## Alternative: Using CF CLI (Org-Scoped Broker)

If you have **org admin** permissions and want to make the broker available to all spaces in an org (but not across orgs), you can register it as org-scoped:

```bash
# Get broker URL and credentials
BROKER_URL="https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com"
BROKER_USER="broker-username"
BROKER_PASS="broker-password"

# Register as org-scoped broker (requires org admin)
cf create-service-broker grant-management-broker-org \
  $BROKER_USER \
  $BROKER_PASS \
  $BROKER_URL

# Enable service access for the org
cf enable-service-access grant-management-service -o mcp -p standard
```

**Limitation:** This only works within the same org, not across different orgs/subaccounts.

## Troubleshooting

### Issue: "btp CLI not found"

**Solution:** Install SAP BTP CLI from https://tools.hana.ondemand.com/#cloud

### Issue: "smctl not found" (deprecated)

**Solution:** `smctl` is deprecated. Use `btp` CLI instead. See Step 1 above.

### Issue: "Invalid service plan" in consumer subaccount

**Solution:** Ensure broker is registered via `smctl` in the consumer subaccount

### Issue: "You cannot change access for space-scoped service plans"

**Solution:** This is expected for space-scoped brokers. Use `smctl` to register in consumer subaccounts instead.

### Issue: Broker authentication fails

**Solution:**

- Verify broker credentials in `mta.yaml`
- Check that broker is running: `cf apps | grep grant-management-broker`
- Verify broker URL is accessible

## Architecture Notes

### IAS Configuration

The broker uses **IAS** (not XSUAA) with the following configuration in `mta.yaml`:

```yaml
grant-management-auth:
  config:
    multi-tenant: true
    xsuaa-cross-consumption: true # Enables cross-consumption
```

This allows:

- Multi-tenant applications
- Cross-consumption scenarios (consumer apps can use provider IAS tokens)
- App-to-App communication across tenants

### Service Manager vs CF Broker Registration

| Method                                       | Scope                | Use Case                                 | Status                            |
| -------------------------------------------- | -------------------- | ---------------------------------------- | --------------------------------- |
| **BTP CLI (`btp register services/broker`)** | Cross-subaccount/org | Reusable services across BTP subaccounts | ✅ Current                        |
| **Service Manager (`smctl`)**                | Cross-subaccount/org | Reusable services (deprecated)           | ⚠️ Deprecated (archived Sep 2025) |
| **CF CLI (`cf create-service-broker`)**      | Org-scoped only      | Services within same org                 | ✅ Available                      |

For reusable services in SAP BTP, **BTP CLI (`btp register services/broker`) is the recommended approach**.

## References

- [SAP Service Manager Documentation](https://wiki.one.int.sap/wiki/display/CPC15N/Service+Provider)
- [IAS Reuse Service Sample](../.cursor/ias/reuse-service-ias/README.MD)
- [IAS Documentation](../.cursor/ias/README.md)
