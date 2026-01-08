# Grant Management Service Broker

This module implements the Service Broker Framework (SBF) for the Grant Management reusable service.

## Overview

The Service Broker enables the Grant Management service to be consumed as a reusable/bindable service through the SAP BTP Service Manager. When applications bind to this service, they receive credentials (URLs, certificates, etc.) that allow them to access the Grant Management API.

## Service Broker API

The broker implements the Open Service Broker (OSB) API v2 specification:

- `GET /v2/catalog` - Returns the service catalog
- `PUT /v2/service_instances/:instance_id` - Provisions a service instance
- `DELETE /v2/service_instances/:instance_id` - Deprovisions a service instance
- `PUT /v2/service_instances/:instance_id/service_bindings/:binding_id` - Creates a service binding
- `DELETE /v2/service_instances/:instance_id/service_bindings/:binding_id` - Deletes a service binding

## Configuration

The broker is configured through environment variables set by the Service Manager:

- `SBF_BROKER_CREDENTIALS` - Broker authentication credentials
- `SBF_SECURE_INCOMING_CONNECTIONS` - Enable secure connections
- `SBF_SERVICE_MANAGER_CERTIFICATE_SUBJECT` - Certificate subject for Service Manager
- `SBF_ENABLE_AUDITLOG` - Enable audit logging
- `SBF_SERVICE_CONFIG` - Service-specific configuration

## Service Credentials

When an application binds to the service, it receives:

- `url` - Service URL for HTTP access
- `cert_url` - Service URL for certificate-based access (mTLS)

Additional credentials can be added as needed.

## Deployment

The broker is deployed as part of the MTA deployment. The Service Manager automatically discovers and registers the broker based on the MTA configuration.





