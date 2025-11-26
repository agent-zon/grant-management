# MTA Configuration Updates

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Category**: [CONFIGURATION] [DEPLOYMENT]  
**Timeline**: 02 of 05 - MTA configuration phase

## Overview

Changes to `mta.yaml` for reusable service pattern.

## Key Changes

### 1. Broker Module Added

```yaml
- name: grant-management-broker
  type: nodejs
  path: ./broker
  requires:
    - name: grant-management-auth
    - name: broker-credentials
    - name: srv
  properties:
    SBF_SECURE_INCOMING_CONNECTIONS: true
    SBF_SERVICE_MANAGER_CERTIFICATE_SUBJECT: /C=DE/O=SAP SE/...
    SBF_SERVICE_CONFIG:
      grant-management-service:
        extend_credentials:
          shared:
            url: ~{service-url}/
```

### 2. Service Module Updates

**Changed**:
- `provides`: `srv-api` → `srv`
- Properties: `srv-url` → `service-url`
- Added: `service-cert-url`

### 3. IAS Configuration

```yaml
grant-management-auth:
  config:
    multi-tenant: true
    xsuaa-cross-consumption: true  # Enables cross-consumption
```

### 4. SMS Configuration

**Changed**:
- `applicationType`: `application` → `service`
- Added: `commercialAppName`, `isDefault`

### 5. Broker Credentials Resource

```yaml
- name: broker-credentials
  properties:
    user: broker-username
    password: broker-password
```

## Important Notes

1. **SBF Certificate Subject**: Must match Service Manager certificate for eu12
2. **Service URL**: Provided via `srv` module properties
3. **Cross-Consumption**: Enabled via IAS configuration
4. **Broker Registration**: Automatic via SBF

## References

- [mta.yaml](../../mta.yaml)
- [REUSABLE_SERVICE_MIGRATION.md](../docs/REUSABLE_SERVICE_MIGRATION.md)

