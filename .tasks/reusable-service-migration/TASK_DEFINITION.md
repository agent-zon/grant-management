# Task: Reusable Service Migration & Cross-Org Broker Setup

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Category**: [ARCHITECTURE] [DEPLOYMENT] [SERVICE-BROKER]

## Overview

This task covers the migration of Grant Management from a SaaS application to a reusable/bindable service, enabling cross-organization consumption through SAP BTP Service Manager. It includes broker implementation, cross-org registration, and authorization setup.

## Goals

1. **Convert Grant Management to Reusable Service**
   - Implement Service Broker Framework (SBF)
   - Update MTA configuration for reusable service pattern
   - Configure IAS for cross-consumption

2. **Enable Cross-Organization Access**
   - Register service broker in consumer subaccounts
   - Migrate from deprecated `smctl` to `btp` CLI
   - Document authorization and permission requirements

3. **Documentation & Tooling**
   - Create comprehensive setup guides
   - Provide diagnostic and registration scripts
   - Document troubleshooting procedures

## Requirements

### Functional Requirements

- [x] Service broker implements Open Service Broker (OSB) API v2
- [x] Broker exposes `grant-management-service` with `standard` plan
- [x] Service bindings provide credentials (url, cert_url)
- [x] Broker supports cross-subaccount registration via `btp` CLI
- [x] IAS configured with `xsuaa-cross-consumption: true`

### Technical Requirements

- [x] Broker module deployed as part of MTA
- [x] SBF integration with Service Manager
- [x] mTLS support with Service Manager provided certificates
- [x] Broker credentials configured in `mta.yaml`
- [x] Cross-region compatibility (eu12 ↔ us10)

### Documentation Requirements

- [x] Migration guide from SaaS to reusable service
- [x] Broker registration procedures
- [x] Authorization troubleshooting guide
- [x] Diagnostic scripts and tools

## Acceptance Criteria

1. ✅ Broker is deployed and accessible in provider subaccount
2. ✅ Broker catalog endpoint returns correct service/plan
3. ✅ Broker can be registered in consumer subaccounts via `btp` CLI
4. ✅ Service appears in marketplace after registration
5. ✅ Service instances can be created and bound in consumer subaccounts
6. ✅ All documentation is organized in task folder structure
7. ✅ Scripts are tested and validated

## Related Tasks

- Authorization Request Implementation
- Consent Details Collection
- MCP Integration

## References

- [IAS Reuse Service Sample](../.cursor/ias/reuse-service-ias/README.MD)
- [Grant Management MDC Rule](../../.cursor/rules/grant-management.mdc)
- [SAP Service Manager Documentation](https://help.sap.com/docs/service-manager)
