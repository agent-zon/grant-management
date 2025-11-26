# Cross-Organization Broker Registration

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Category**: [DEPLOYMENT] [SERVICE-BROKER]  
**Timeline**: 03 of 05 - Cross-org registration phase

## Overview

Process and tools for registering service broker in consumer subaccounts.

## Migration: smctl → btp CLI

### Deprecated: smctl

- **Status**: Deprecated, archived Sep 30, 2025
- **Command**: `smctl login` + `smctl curl -X POST /v1/service_brokers`
- **Authentication**: Subdomain + email + password+2FA

### Current: btp CLI

- **Status**: Current and supported
- **Command**: `btp register services/broker`
- **Authentication**: Standard `btp login`

### Registration Command

```bash
btp register services/broker \
  --subaccount <subaccount-id> \
  --name grant-management-broker \
  --url https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com \
  --user broker-username \
  --password broker-password \
  --use-sm-tls true \
  --description "Grant Management OAuth 2.0 Server"
```

## Required Permissions

1. **Role Collections**:
   - Subaccount Administrator (recommended)
   - OR Service Manager Administrator

2. **Entitlements**:
   - Service Manager (must be assigned to subaccount)

## Common Issues

### Authorization Failed

**Cause**: Missing role collections

**Solution**: Assign "Subaccount Administrator" role collection via BTP Cockpit

### Region Mismatch

**Cause**: Broker and subaccount in different regions

**Solution**: 
- Find subaccount in same region (eu12)
- Or accept cross-region latency (for testing)

### Service Not Visible

**Cause**: Broker not registered

**Solution**: 
- Verify registration: `btp list services/broker --subaccount <id>`
- Check marketplace: `cf marketplace | grep grant-management`

## Scripts Created

1. **register-broker-consumer.sh**: Main registration script
2. **test-broker-registration.sh**: Prerequisites validation
3. **diagnose-authorization.sh**: Authorization diagnostics
4. **find-subaccount-id.sh**: Helper to find subaccount IDs

## References

- [BROKER_CROSS_ORG_SETUP.md](../docs/BROKER_CROSS_ORG_SETUP.md)
- [BROKER_REGISTRATION_MIGRATION.md](../docs/BROKER_REGISTRATION_MIGRATION.md)
- [AUTHORIZATION_TROUBLESHOOTING.md](../docs/AUTHORIZATION_TROUBLESHOOTING.md)

