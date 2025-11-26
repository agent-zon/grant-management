# Production Deployment Status

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Category**: [DEPLOYMENT] [PRODUCTION]  
**Timeline**: 08 of 08 - Production deployment phase

## Deployment Information

### Provider Subaccount
- **Subaccount ID**: `95e48ebf-f5e5-4c04-a317-6f0a613054f6`
- **Org**: `scai`
- **Space**: `grants`
- **Region**: eu12 (based on broker URL)
- **Status**: ✅ Service deployed

### Consumer Subaccount
- **Subaccount ID**: `bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
- **Org**: `mcp`
- **Space**: `dev` (assumed)
- **Status**: ⚠️ Service not visible in marketplace

## Current Issue

**Problem**: Service not visible in marketplace in consumer subaccount

**Root Cause**: Broker is not registered in consumer subaccount

**Explanation**:
- When service was an **application**, it was visible via SaaS subscription
- Now as a **reusable service**, the broker must be registered in each consumer subaccount
- Broker is deployed in provider subaccount but not registered in consumer subaccount

## Verification Results

### Provider Subaccount (95e48ebf-f5e5-4c04-a317-6f0a613054f6)
- ✅ Service deployed
- ✅ Broker application running
- ⚠️ Cannot verify broker registration (subaccount not in current global account)

### Consumer Subaccount (bc4da301-d38a-4038-bd30-dd6c78f3c7dc)
- ❌ Service not in marketplace
- ❌ Broker not registered
- ⚠️ Cannot verify (subaccount not in current global account)

## Solution

### Step 1: Login to Correct Global Account

The subaccounts are not in the current global account (`aisc`). Need to login to the correct global account:

```bash
btp login
# Select the global account containing subaccount bc4da301-d38a-4038-bd30-dd6c78f3c7dc
```

### Step 2: Verify Broker URL

Get the actual broker URL from provider subaccount:

```bash
# In provider subaccount (scai/grants)
cf target -o scai -s grants
cf apps | grep grant-management-broker
```

Expected broker URL format:
```
https://<app-name>.cert.cfapps.eu12.hana.ondemand.com
```

### Step 3: Register Broker in Consumer Subaccount

```bash
./artifacts/register-broker-consumer.sh bc4da301-d38a-4038-bd30-dd6c78f3c7dc grant-management-broker
```

**Note**: May require:
- "Subaccount Administrator" role in consumer subaccount
- Service Manager entitlement in consumer subaccount

### Step 4: Verify Service in Marketplace

```bash
# In consumer subaccount (mcp/dev)
cf target -o mcp -s dev
cf marketplace | grep grant-management
```

## Key Differences: Application vs Reusable Service

### Application (Previous)
- Visible in marketplace automatically
- Accessed via subscription
- Multi-tenant via SMS subscriptions

### Reusable Service (Current)
- **Must register broker in each consumer subaccount**
- Accessed via service binding
- Multi-tenant via service instances

## Troubleshooting

### Service Not in Marketplace

**Check 1**: Is broker registered?
```bash
btp list services/broker --subaccount bc4da301-d38a-4038-bd30-dd6c78f3c7dc | grep grant-management
```

**Check 2**: Are permissions correct?
```bash
./artifacts/diagnose-authorization.sh bc4da301-d38a-4038-bd30-dd6c78f3c7dc
```

**Check 3**: Is Service Manager entitlement assigned?
- Check in BTP Cockpit → Subaccount → Entitlements

### Broker Registration Fails

**Common Issues**:
1. Authorization failed → Need "Subaccount Administrator" role
2. Subaccount not found → Wrong global account
3. Broker URL incorrect → Verify from provider subaccount

## Next Actions

1. ✅ Login to correct global account
2. ✅ Verify broker URL from provider
3. ✅ Register broker in consumer subaccount
4. ✅ Verify service in marketplace
5. ✅ Test service instance creation

## References

- [Broker Registration Guide](../docs/BROKER_CROSS_ORG_SETUP.md)
- [Authorization Troubleshooting](../docs/AUTHORIZATION_TROUBLESHOOTING.md)
- [Verify Broker Status Script](../artifacts/verify-broker-status.sh)

