# Notes: Reusable Service Migration

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27

## Key Learnings

### Service Broker Framework (SBF)

- SBF is automatically provided by SAP BTP when broker module is deployed
- SBF environment variables configure broker behavior
- Service Manager automatically discovers and registers brokers

### IAS Cross-Consumption

- `xsuaa-cross-consumption: true` enables cross-consumption scenarios
- Consumer apps can use provider IAS tokens
- Multi-tenant applications supported

### Broker Registration

- **Deprecated**: `smctl` (archived Sep 30, 2025)
- **Current**: `btp register services/broker`
- Requires: Subaccount Administrator or Service Manager Administrator role
- Requires: Service Manager entitlement in subaccount

### Region Considerations

- Broker deployed in: eu12
- Cross-region registration possible but may have latency
- Recommended: Register in same region as broker for production

## Common Issues

### Authorization Failed

**Cause**: Missing role collections or entitlements

**Solution**:
1. Assign "Subaccount Administrator" role collection
2. Verify Service Manager entitlement is assigned
3. Check subaccount permissions in BTP Cockpit

### Region Mismatch

**Cause**: Broker and subaccount in different regions

**Solution**:
1. Find subaccount in same region as broker
2. Or accept cross-region latency (for testing)

### Service Not Visible

**Cause**: Broker not registered in consumer subaccount

**Solution**:
1. Register broker using `btp register services/broker`
2. Verify registration: `btp list services/broker --subaccount <id>`
3. Check marketplace: `cf marketplace | grep grant-management`

## Scripts Reference

- `register-broker-consumer.sh`: Main registration script
- `test-broker-registration.sh`: Prerequisites validation
- `diagnose-authorization.sh`: Authorization diagnostics
- `find-subaccount-id.sh`: Helper to find subaccount IDs

## References

- [IAS Reuse Service Sample](../../.cursor/ias/reuse-service-ias/README.MD)
- [SAP BTP CLI Documentation](https://tools.hana.ondemand.com/#cloud)
- [Service Manager Documentation](https://help.sap.com/docs/service-manager)

