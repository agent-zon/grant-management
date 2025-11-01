#pragma warning disable ASPIREINTERACTION001
#pragma warning disable ASPIREHOSTINGPYTHON001
#pragma warning disable ASPIREPUBLISHERS001
#pragma warning disable ASPIREPUBLISHERS001

var builder = DistributedApplication.CreateBuilder(args);

var pg = builder.AddPostgres("pg")
    .WithDataVolume(builder.ExecutionContext.IsPublishMode ? "pgvolume" : null)
    .WithPgAdmin();

var userToAgentConsentDb = pg    
    .AddDatabase("user-2-agent-consent-db");

var toolPoliciesDb = pg
    .AddDatabase("grant-management-db");

#pragma warning disable ASPIREINTERACTION001

var oidcAuthority = builder.AddParameter("oidc-authority")
    .WithDescription("OIDC Authority URL")
    .WithCustomInput(p => new()
    {
        Name = "oidc-authority",
        InputType = InputType.Text,
        Value = "https://fidm.us1.gigya.com/oidc/op/v1.0/4_XM-g32xng55dZ2ARJl4VXw",
        Label = p.Name,
        Placeholder = "Enter the OIDC Authority URL",
        Description = p.Description
    });

var oidcClientId = builder.AddParameter("oidc-client-id")
    .WithDescription("OIDC Client ID")
    .WithCustomInput(p => new()
    {
        Name = "oidc-client-id",
        InputType = InputType.Text,
        Value = "vXR7Thf2JY-ZJt6OCg4iDpAx",
        Label = p.Name,
        Placeholder = "Enter the OIDC Client ID",
        Description = p.Description
    });

var oidcAudience = builder.AddParameter("oidc-audience")
    .WithDescription("OIDC Audience")
    .WithCustomInput(p => new()
    {
        Name = "oidc-audience",
        InputType = InputType.Text,
        Value = "AgentToMcp",
        Label = p.Name,
        Placeholder = "Enter the OIDC Audience",
        Description = p.Description
    });

#pragma warning restore ASPIREINTERACTION001


var grantManagementServer = builder.AddProject<Projects.GrantManagementServer>("GrantManagementServer")
    .WithReference(toolPoliciesDb)
    .WaitFor(toolPoliciesDb)
    .WithExternalHttpEndpoints();


var grant = builder.AddProject<Projects.GrantMcpLayer>("GrantMcpLayer")
    .WithReference(userToAgentConsentDb)
    .WithReference(grantManagementServer)
    // .WaitFor(grantManagementServer)
    .WithEnvironment("OIDC_AUTHORITY", oidcAuthority)
    .WithEnvironment("OIDC_CLIENT_ID", oidcClientId)
    .WithEnvironment("McpServerInfo:Url", "https://gitmcp.io/zon-cx/mcp-identity")
    .WithEnvironment("McpServerInfo:Name", "gitmcp")
    .WithEnvironment("McpServerInfo:Type", "http");

builder
    .AddMcpInspector("inspector")
    .WithMcpServer(grant, isDefault: true)
    .WaitFor(grant)
    .WithEnvironment("MCP_SERVER_URL", grant.GetEndpoint("http"))
    .WithEnvironment("DEFAULT_MCP_SERVER", grant.Resource.Name)
    .WithUrlForEndpoint(McpInspectorResource.ClientEndpointName, annotation =>
    {
        annotation.DisplayText = "Client";
        annotation.DisplayOrder = 1;
        annotation.DisplayLocation = UrlDisplayLocation.SummaryAndDetails;
    })
    .WithUrlForEndpoint(McpInspectorResource.ServerProxyEndpointName, annotation =>
    {
        annotation.DisplayText = "Server";
        annotation.DisplayOrder = 3;
        annotation.DisplayLocation = UrlDisplayLocation.DetailsOnly;
    });
var ui = builder.AddNpmApp("ui", "../../cockpit-ui")
    .WithNpmPackageInstallation()
    .WithReference(grantManagementServer)
    .WaitFor(grantManagementServer)
    .WithHttpEndpoint(env: "PORT", port: 7080)
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_BASE_URL", grantManagementServer.GetEndpoint("http"))
    .WithEnvironment("VITE_OIDC_AUTHORITY", oidcAuthority)
    .WithEnvironment("VITE_OIDC_CLIENT_ID", oidcClientId)
    .WithEnvironment("VITE_OIDC_AUDIENCE", oidcAudience)
    .WithOtlpExporter();


builder.Build().Run();
