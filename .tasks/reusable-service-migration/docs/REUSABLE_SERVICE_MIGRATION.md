# Grant Management - Reusable Service Migration

This document summarizes the changes made to convert the Grant Management application from a SaaS application to a reusable/bindable service.

## Overview

The Grant Management service has been converted from a SaaS application (where customers subscribe) to a reusable service (where applications bind to consume the service). This enables the service to be consumed by other applications through service bindings rather than tenant subscriptions.

## Key Changes

### 1. Service Broker Module Added

**New Files:**
- `broker/package.json` - Broker dependencies
- `broker/server.js` - Service Broker API implementation (OSB v2)
- `broker/README.md` - Broker documentation
- `broker/.gitignore` - Broker-specific ignores

**Purpose:** The broker implements the Open Service Broker (OSB) API v2, allowing the Service Manager to discover, provision, and manage bindings to the Grant Management service.

### 2. MTA Configuration Updates

**Changes in `mta.yaml`:**

#### Added Broker Module
- New module `grant-management-broker` that implements the Service Broker Framework
- Configured with SBF environment variables for Service Manager integration
- Requires broker credentials and service URL references

#### Updated Service Module
- Changed `provides` from `srv-api` to `srv` (standard naming for reusable services)
- Updated property names: `srv-url` → `service-url`, added `service-cert-url`
- Removed dependency on `app-api` (no longer needed for reusable services)

#### Updated SMS Configuration
- Changed `applicationType` from `application` to `service`
- Added `commercialAppName` and `isDefault` properties
- Updated dependencies to include `srv` module

#### Updated IAS Catalog Configuration
- Service name changed to `grant-management-service`
- Added service and plan IDs for catalog registration
- Updated `bindingData` to include service URLs in credentials

#### Updated MTX Sidecar
- Changed dependency from `app-api` to `srv`
- Updated `SUBSCRIPTION_URL` to use service URL instead of app URL

#### Approuter (Optional)
- Approuter module is now commented out (not needed for reusable services)
- Can be uncommented if admin/management UI is required

### 3. Resource Configuration

#### Broker Credentials
- Added `broker-credentials` resource for Service Broker authentication

#### IAS Service Instance
- Updated to require `srv` instead of `app-api`
- Catalog configuration updated for reusable service pattern
- Redirect URIs simplified (no longer tenant-specific)

## Architecture Changes

### Before (SaaS Application)
```
Tenant → Approuter → Service → Database
         ↓
      MTX Sidecar
```

### After (Reusable Service)
```
Consumer App → Service Binding → Service → Database
                                    ↓
                                 MTX Sidecar
                                    ↓
                                 Broker
```

## Service Consumption

### For Service Consumers

Applications can now bind to the Grant Management service:

```bash
# Create service instance
cf create-service grant-management-service standard my-grant-mgmt

# Bind to application
cf bind-service my-app my-grant-mgmt
```

The binding provides credentials:
- `url` - Service URL for HTTP access
- `cert_url` - Service URL for certificate-based access (mTLS)

### Service Catalog

The service appears in the Service Manager catalog as:
- **Service Name:** `grant-management-service`
- **Plan:** `standard`
- **Description:** SAP AI Security Cloud - Grant Management OAuth 2.0 Server

## Next Steps

### 1. Deploy the Updated MTA

```bash
mbt build
cf deploy mta_archives/grant-management_1.0.0.mtar
```

### 2. Register Service Broker

The broker should be automatically registered by the Service Manager. Verify registration:

```bash
cf service-brokers
```

### 3. Verify Service Catalog

Check that the service appears in the catalog:

```bash
cf marketplace
```

### 4. Test Service Binding

Create a test service instance and binding:

```bash
cf create-service grant-management-service standard test-instance
cf bind-service test-app test-instance
cf env test-app
```

### 5. Update Consumer Applications

Applications consuming this service should:
- Read credentials from `VCAP_SERVICES`
- Use the `url` or `cert_url` from binding credentials
- Handle authentication using the provided IAS credentials

## Important Notes

1. **Multi-tenancy:** The service still supports multi-tenancy through MTX, but tenants are now managed through service bindings rather than SaaS subscriptions.

2. **IAS Configuration:** The IAS service instance remains multi-tenant, but the consumption model has changed from subscription-based to binding-based.

3. **MTX Sidecar:** The MTX sidecar continues to handle tenant provisioning, but now responds to service binding events rather than subscription events.

4. **Backward Compatibility:** Existing SaaS subscriptions will need to be migrated to service bindings if you want to fully transition to the reusable service model.

## Troubleshooting

### Service Not Appearing in Catalog

- Verify broker is registered: `cf service-brokers`
- Check broker logs: `cf logs grant-management-broker --recent`
- Verify IAS catalog configuration in `mta.yaml`

### Binding Fails

- Check service instance status: `cf service test-instance`
- Verify service URL is accessible
- Check MTX sidecar logs for provisioning errors

### Authentication Issues

- Verify IAS service instance is properly configured
- Check certificate-based authentication is working
- Verify redirect URIs match consumer application URLs

## References

- [SAP BTP Service Manager Documentation](https://help.sap.com/docs/btp/sap-business-technology-platform/service-manager)
- [Open Service Broker API Specification](https://github.com/openservicebrokerapi/servicebroker)
- [Multi-Tenancy Guide](../.cursor/cds/mt.md)
- [MTX Reference](../.cursor/cds/mtx.md)


