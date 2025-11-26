# Broker Registration Migration: smctl → btp CLI

**Date:** $(date)  
**Status:** ✅ Migrated to btp CLI

## Summary

The broker registration scripts have been updated to use **SAP BTP CLI (`btp`)** instead of the deprecated **Service Manager CLI (`smctl`)**.

## Changes Made

### 1. Updated Scripts

- ✅ **`register-broker-consumer.sh`** - Now uses `btp register services/broker`
- ✅ **`test-broker-registration.sh`** - Updated to check for `btp` CLI instead of `smctl`
- ✅ **`BROKER_CROSS_ORG_SETUP.md`** - Documentation updated with new commands

### 2. Key Differences

| Aspect | smctl (Deprecated) | btp CLI (Current) |
|--------|-------------------|-------------------|
| **Status** | ⚠️ Deprecated (archived Sep 30, 2025) | ✅ Current |
| **Installation** | Service Manager docs | SAP Development Tools |
| **Login** | `smctl login -a <url> --param subdomain=<subdomain> -u <email>` | `btp login` |
| **Registration** | `smctl curl -X POST /v1/service_brokers -d '{...}'` | `btp register services/broker --subaccount <id> ...` |
| **List Brokers** | `smctl list-brokers` | `btp list services/broker --subaccount <id>` |
| **Authentication** | Subdomain + email + password+2FA | Standard BTP login |

### 3. New Registration Command

**Old (smctl - deprecated):**
```bash
smctl login -a https://service-manager.cfapps.eu12.hana.ondemand.com \
  --param subdomain=mcp -u dina.vinter@sap.com

smctl curl -X POST /v1/service_brokers -d '{
  "broker_url": "...",
  "credentials": {...}
}'
```

**New (btp CLI):**
```bash
btp login

btp register services/broker \
  --subaccount <subaccount-id> \
  --name grant-management-broker \
  --url https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com \
  --user broker-username \
  --password broker-password \
  --use-sm-tls true \
  --description "Grant Management OAuth 2.0 Server"
```

## Benefits of btp CLI

1. **Unified CLI** - Single tool for all BTP operations
2. **Better Security** - Built-in support for `--use-sm-tls` with automatic certificate rotation
3. **Simpler Authentication** - Standard `btp login` instead of complex smctl login
4. **Subaccount-based** - Uses subaccount IDs (more reliable than subdomains)
5. **Future-proof** - Actively maintained and supported

## Migration Steps for Users

1. **Install btp CLI** (if not already installed):
   ```bash
   # Download from: https://tools.hana.ondemand.com/#cloud
   ```

2. **Login to BTP**:
   ```bash
   btp login
   ```

3. **Get Subaccount ID**:
   ```bash
   btp list accounts/subaccount
   ```

4. **Run Updated Script**:
   ```bash
   ./register-broker-consumer.sh <subaccount-id> [broker-name]
   ```

## Testing

All scripts have been tested and validated:

- ✅ Script syntax validation passed
- ✅ Broker health check working
- ✅ Broker catalog endpoint verified
- ✅ btp CLI detection working
- ✅ Updated documentation complete

## Files Updated

1. `register-broker-consumer.sh` - Main registration script
2. `test-broker-registration.sh` - Prerequisites test script
3. `BROKER_CROSS_ORG_SETUP.md` - Setup documentation
4. `BROKER_REGISTRATION_MIGRATION.md` - This file

## References

- **SAP BTP CLI**: https://tools.hana.ondemand.com/#cloud
- **smctl Deprecation**: https://help.sap.com/doc/54cafcfb7b2148acac1482116b793eeb/Cloud/en-US/BUILDABLEMAP.pdf
- **Service Manager Documentation**: https://help.sap.com/docs/service-manager

