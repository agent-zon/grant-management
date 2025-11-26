# Quick Fix Guide: Service Not Visible in Marketplace

**Issue**: Service deployed to provider subaccount but not visible in consumer marketplace  
**Date**: 2025-01-27

## Problem Summary

- **Provider**: Subaccount `95e48ebf-f5e5-4c04-a317-6f0a613054f6` (scai/grants) - ✅ Service deployed
- **Consumer**: Subaccount `bc4da301-d38a-4038-bd30-dd6c78f3c7dc` (mcp) - ❌ Service NOT visible

**Root Cause**: Broker is not registered in consumer subaccount. When the service was an **application**, it was visible via SaaS subscription. Now as a **reusable service**, the broker must be registered in each consumer subaccount.

## Quick Fix Steps

### Step 1: Login to Correct Global Account

The subaccounts are not in the current global account (`aisc`). Login to the correct one:

```bash
btp login
# Select the global account that contains subaccount bc4da301-d38a-4038-bd30-dd6c78f3c7dc
```

### Step 2: Verify Broker URL (Optional - if needed)

If you need to verify the broker URL:

```bash
# Login to CF in provider subaccount
cf login -a https://api.cf.eu12.hana.ondemand.com -o scai -s grants

# Get broker URL
cf apps | grep grant-management-broker
```

Expected URL format:
```
https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com
```

### Step 3: Register Broker in Consumer Subaccount

```bash
cd .tasks/reusable-service-migration/artifacts
./register-broker-consumer.sh bc4da301-d38a-4038-bd30-dd6c78f3c7dc grant-management-broker
```

**If authorization fails**, you need:
- "Subaccount Administrator" role in consumer subaccount
- Service Manager entitlement in consumer subaccount

### Step 4: Verify Service in Marketplace

```bash
# Login to CF in consumer subaccount
cf login -a https://api.cf.eu12.hana.ondemand.com -o mcp -s dev

# Check marketplace
cf marketplace | grep grant-management
```

You should see:
```
grant-management-service   standard   ...
```

### Step 5: Create Service Instance

```bash
cf create-service grant-management-service standard test-instance
```

## Troubleshooting

### Authorization Failed

**Solution**: Get "Subaccount Administrator" role assigned
- Via BTP Cockpit: Subaccount → Security → Role Collections → Subaccount Administrator
- Or ask Global Account Administrator

### Subaccount Not Found

**Solution**: Login to correct global account
```bash
btp login
# Select the global account containing the subaccounts
```

### Service Still Not Visible

**Check**:
1. Broker registered? `btp list services/broker --subaccount bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
2. Service Manager entitlement? Check in BTP Cockpit
3. Correct subaccount? Verify subaccount ID

## Verification Commands

```bash
# Verify broker status
./artifacts/verify-broker-status.sh

# Check broker registration
btp list services/broker --subaccount bc4da301-d38a-4038-bd30-dd6c78f3c7dc

# Check marketplace
cf marketplace | grep grant-management
```

## Key Difference: Application vs Reusable Service

| Aspect | Application (Before) | Reusable Service (Now) |
|--------|---------------------|----------------------|
| **Visibility** | Automatic via subscription | Requires broker registration |
| **Access** | Via subscription | Via service binding |
| **Multi-tenancy** | SMS subscriptions | Service instances |

## References

- [Broker Registration Guide](./docs/BROKER_CROSS_ORG_SETUP.md)
- [Production Deployment Status](./memory-bank/08_production-deployment-status.md)
- [Authorization Troubleshooting](./docs/AUTHORIZATION_TROUBLESHOOTING.md)

