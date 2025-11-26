# Status: Reusable Service Migration & Cross-Org Broker Setup

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Status**: IN_PROGRESS - Broker Registration Required

## Current Status

### ✅ Completed

1. **Service Broker Implementation**
   - ✅ Broker module created (`broker/server.js`)
   - ✅ OSB API v2 endpoints implemented
   - ✅ Service catalog configured
   - ✅ Broker deployed in provider subaccount (scai/grants)

2. **MTA Configuration**
   - ✅ Broker module added to `mta.yaml`
   - ✅ SBF configuration with Service Manager integration
   - ✅ Broker credentials resource configured
   - ✅ IAS configured for cross-consumption

3. **Cross-Org Registration**
   - ✅ Migrated from deprecated `smctl` to `btp` CLI
   - ✅ Registration script created (`register-broker-consumer.sh`)
   - ✅ Test script created (`test-broker-registration.sh`)
   - ✅ Diagnostic script created (`diagnose-authorization.sh`)

4. **Documentation**
   - ✅ Broker setup guide (BROKER_CROSS_ORG_SETUP.md)
   - ✅ Migration guide (BROKER_REGISTRATION_MIGRATION.md)
   - ✅ Test results (BROKER_TEST_RESULTS.md)
   - ✅ Authorization troubleshooting (AUTHORIZATION_TROUBLESHOOTING.md)
      - ✅ REUSABLE_SERVICE_MIGRATION.md created
   - ✅ Architecture changes documented
   - ✅ Service consumption patterns documented


### 🔄 In Progress

1. **Production Deployment**
   - ✅ Service deployed to provider subaccount: `95e48ebf-f5e5-4c04-a317-6f0a613054f6` (scai/grants)
   - ❌ Service NOT visible in consumer subaccount: `bc4da301-d38a-4038-bd30-dd6c78f3c7dc` (mcp)
   - ⚠️ **Root Cause**: Broker not registered in consumer subaccount
   - ⚠️ Subaccounts not in current global account (`aisc`) - need to login to correct global account

2. **Cross-Org Registration**
   - ⚠️ Broker registration pending in consumer subaccount
   - ⚠️ Authorization issues (subaccount not accessible in current global account)
   - ⚠️ Need to login to correct global account containing consumer subaccount
   - ⚠️ Need to assign "Subaccount Administrator" role (if needed)
   - ⚠️ Need to verify Service Manager entitlement

### 📋 Pending

1. **Production Setup - URGENT**
   - [x] Service deployed to provider subaccount: `95e48ebf-f5e5-4c04-a317-6f0a613054f6`
   - [ ] **Login to correct global account** (subaccounts not in current `aisc` account)
   - [ ] **Verify broker URL** from provider subaccount (scai/grants)
   - [ ] **Register broker in consumer subaccount**: `bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
   - [ ] **Verify service availability in marketplace** (mcp org)
   - [ ] Test service instance creation and binding

2. **Catalog Enhancement**
   - [ ] Verify if `auto_subscription` metadata needed
   - [ ] Add `auto_subscription` to catalog if required
   - [ ] Test subscription callbacks

3. **Consumer Documentation**
   - [ ] Document `consumed-services` configuration
   - [ ] Create consumer example application
   - [ ] Document token forwarding patterns

4. **Testing**
   - [ ] End-to-end test: Create service instance in consumer
   - [ ] End-to-end test: Bind service to application
   - [ ] Verify credentials are provided correctly
   - [ ] Test token forwarding with `consumed-services`
   - [ ] Test cross-region scenarios (if applicable)

## Blockers

1. **Global Account Access**: Subaccounts are in same global account but not accessible in current session
   - **Status**: Subaccounts `95e48ebf-f5e5-4c04-a317-6f0a613054f6` and `bc4da301-d38a-4038-bd30-dd6c78f3c7dc` confirmed to be in same global account
   - **Action**: May need to re-login or verify permissions: `btp login`
2. **Broker Registration**: Broker not registered in consumer subaccount `bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
   - **Action**: Register broker using `./artifacts/register-broker-to-mcp.sh` (quick) or `./artifacts/register-broker-consumer.sh bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
3. **Authorization**: May need "Subaccount Administrator" role in consumer subaccount
   - **Action**: Assign role via BTP Cockpit or ask Global Account Administrator

## Next Steps (Priority Order)

1. **URGENT**: Verify/Re-login to global account (if subaccounts not accessible)

   ```bash
   # If subaccounts not accessible, re-login:
   btp login
   # Select the global account containing both subaccounts
   ```

2. **URGENT**: Register broker in consumer subaccount

   ```bash
   # Quick registration script (recommended):
   ./artifacts/register-broker-to-mcp.sh

   # Or use full script:
   ./artifacts/register-broker-consumer.sh bc4da301-d38a-4038-bd30-dd6c78f3c7dc grant-management-broker
   ```

   **Note**: If authorization fails, you need "Subaccount Administrator" role in consumer subaccount.

3. **URGENT**: Verify service in marketplace

   ```bash
   cf target -o mcp -s dev
   cf marketplace | grep grant-management
   ```

4. Test service instance creation
   ```bash
   cf create-service grant-management-service standard test-instance
   ```

## Metrics

- **Broker Health**: ✅ Healthy (HTTP 200)
- **Catalog Endpoint**: ✅ Working
- **Registration Scripts**: ✅ Created and tested
- **Documentation**: ✅ Comprehensive
- **Provider Deployment**: ✅ Deployed to `95e48ebf-f5e5-4c04-a317-6f0a613054f6`
- **Consumer Visibility**: ❌ Not visible (broker not registered)
- **Global Account**: ⚠️ Subaccounts in same global account but not accessible in current session (may need re-login)

## Production Deployment Details

### Provider Subaccount

- **ID**: `95e48ebf-f5e5-4c04-a317-6f0a613054f6`
- **Org**: `scai`
- **Space**: `grants`
- **Broker URL**: `https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com`
- **Status**: ✅ Deployed

### Consumer Subaccount

- **ID**: `bc4da301-d38a-4038-bd30-dd6c78f3c7dc`
- **Org**: `mcp`
- **Space**: `dev` (assumed)
- **Status**: ❌ Service not in marketplace
- **Issue**: Broker not registered in this subaccount
