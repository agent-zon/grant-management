/**
 * Service Broker Framework (SBF) server for Grant Management reusable service
 *
 * This broker enables the Grant Management service to be consumed as a reusable/bindable service
 * through the SAP BTP Service Manager.
 *
 * The Service Broker Framework (SBF) is automatically provided by SAP BTP when the broker module
 * is deployed. The SBF environment variables configure the broker behavior.
 */

import express from "express";

const app = express();
app.use(express.json());

// Service Broker API endpoints
// These endpoints are called by the Service Manager to manage service instances and bindings

// GET /v2/catalog - Returns the service catalog
app.get("/v2/catalog", (req, res) => {
  res.json({
    services: [
      {
        id: "grant-management-service-id",
        name: "grant-management-service",
        description:
          "SAP AI Security Cloud - Grant Management OAuth 2.0 Server",
        bindable: true,
        plan_updateable: true,
        instances_retrievable: true,
        bindings_retrievable: true,
        metadata: {
          displayName: "Grant Management OAuth 2.0 Server",
          documentationUrl:
            process.env.SERVICE_DOCUMENTATION_URL ||
            "https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/api-docs/index.html",
          longDescription:
            "SAP AI Security Cloud - Grant Management OAuth 2.0 Server for managing grants, authorizations, and tokens",
        },
        plans: [
          {
            id: "grant-management-standard-plan-id",
            name: "standard",
            description: "Standard plan for Grant Management OAuth 2.0 Server",
            free: true,
            bindable: true,
            metadata: {
              displayName: "Standard Plan",
              description:
                "Standard plan for Grant Management OAuth 2.0 Server",
            },
          },
        ],
      },
    ],
  });
});

// PUT /v2/service_instances/:instance_id - Provision a service instance
app.put("/v2/service_instances/:instance_id", async (req, res) => {
  const { instance_id } = req.params;
  const { service_id, plan_id, organization_guid, space_guid } = req.body;

  console.log(`Provisioning service instance: ${instance_id}`);

  // For reusable services, provisioning is typically handled by SMS
  // This endpoint may just acknowledge the request
  res.status(201).json({
    dashboard_url: process.env.SERVICE_DASHBOARD_URL,
    operation: "provision",
  });
});

// DELETE /v2/service_instances/:instance_id - Deprovision a service instance
app.delete("/v2/service_instances/:instance_id", async (req, res) => {
  const { instance_id } = req.params;
  const { service_id, plan_id } = req.query;

  console.log(`Deprovisioning service instance: ${instance_id}`);

  res.status(200).json({});
});

// PUT /v2/service_instances/:instance_id/service_bindings/:binding_id - Create a service binding
app.put(
  "/v2/service_instances/:instance_id/service_bindings/:binding_id",
  async (req, res) => {
    const { instance_id, binding_id } = req.params;
    const { service_id, plan_id } = req.body;

    console.log(
      `Creating service binding: ${binding_id} for instance: ${instance_id}`
    );

    // Get service URL from SBF_SERVICE_CONFIG or environment
    let serviceUrl = process.env.SERVICE_URL;
    let serviceCertUrl = process.env.SERVICE_CERT_URL;

    // Try to get from SBF_SERVICE_CONFIG
    if (!serviceUrl && process.env.SBF_SERVICE_CONFIG) {
      try {
        const sbfConfig = JSON.parse(process.env.SBF_SERVICE_CONFIG);
        if (
          sbfConfig["grant-management-service"]?.extend_credentials?.shared?.url
        ) {
          serviceUrl =
            sbfConfig["grant-management-service"].extend_credentials.shared.url;
        }
      } catch (e) {
        console.warn("Failed to parse SBF_SERVICE_CONFIG:", e.message);
      }
    }

    // Fallback to default URLs if not set
    serviceUrl =
      serviceUrl ||
      "https://scai-grants-grant-management-srv.cfapps.eu12.hana.ondemand.com";
    serviceCertUrl =
      serviceCertUrl ||
      "https://scai-grants-grant-management-srv.cert.cfapps.eu12.hana.ondemand.com";

    res.status(201).json({
      credentials: {
        url: serviceUrl,
        cert_url: serviceCertUrl,
        // Additional credentials can be added here
      },
    });
  }
);

// DELETE /v2/service_instances/:instance_id/service_bindings/:binding_id - Delete a service binding
app.delete(
  "/v2/service_instances/:instance_id/service_bindings/:binding_id",
  async (req, res) => {
    const { instance_id, binding_id } = req.params;
    const { service_id, plan_id } = req.query;

    console.log(
      `Deleting service binding: ${binding_id} for instance: ${instance_id}`
    );

    res.status(200).json({});
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Grant Management Service Broker listening on port ${port}`);
  console.log(`Service URL: ${process.env.SERVICE_URL || "not set"}`);
});
