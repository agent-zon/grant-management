using System.Text.Json.Nodes;
using System.Threading.Channels;
using Duende.IdentityModel.Client;
using GrantMcpLayer.Models;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.ScopeFilter;

public static class Tools
{
    public static McpRequestFilter<CallToolRequestParams, CallToolResult> Call()
    {
        return (next) =>
        {
            return async ValueTask<CallToolResult> (context, token) =>
            {
              var dbContext = context.Services.GetRequiredService<AppDbContext>();
                var filter = new
                {
                    agent = context.User?.FindFirst(e => e.Type == "client_id")?.Value ?? "default-agent-id",
                    tool = context.Params!.Name,
                    grant = context.User?.FindFirst(c => c.Type == "jti")?.Value ?? context.Server.SessionId,
                    user = context.User?.FindFirst(c => c.Type == "sub")?.Value
                };
                if (dbContext.ToolActivationConsents.Any(x =>
                        x.AgentId ==  filter.agent &&
                        x.ToolName == filter.tool &&
                        x.ConversationId == filter.grant &&
                        x.UserId == filter.user &&
                        x.ValidUntil >= DateTime.UtcNow))
                    return await next(context, token);

                //todo: re-enable after fixing grant management runner, or embedding policy in this service
                // var grantManagementClient = context.Services.GetRequiredService<IGrantManagementClient>();
                // var toolPolicy = await grantManagementClient.GetToolPolicyAsync(context.Params.Name, token);
                // if (toolPolicy == null || !toolPolicy.ExplicitConsentPolicy.RequiresExplicitConsent)
                //     return await next(context, token);


                var clientFactory = context.Services.GetRequiredService<IHttpClientFactory>();
                var httpClient = clientFactory.CreateClient();
                var configuration = context.Services.GetRequiredService<IConfiguration>();
                var authority = configuration.GetValue<string>("OIDC_AUTHORITY");
                var discovery = await httpClient.GetDiscoveryDocumentAsync(authority, token);
                var deviceAuthorizeRequest = new DeviceAuthorizationRequest
                {
                    ClientCredentialStyle = ClientCredentialStyle.PostBody,
                    Address = discovery.DeviceAuthorizationEndpoint,
                    ClientId = configuration.GetValue<string>("OIDC_CLIENT_ID"),
                    Scope = "openid profile uid"
                };
                var authorize = await httpClient.RequestDeviceAuthorizationAsync(deviceAuthorizeRequest, token);
                var deviceTokenRequest = new DeviceTokenRequest
                {
                    DeviceCode = authorize.DeviceCode,
                    Address = discovery.TokenEndpoint,
                    ClientId = configuration.GetValue<string>("OIDC_CLIENT_ID"),
                    ClientCredentialStyle = ClientCredentialStyle.PostBody
                };

                var now = DateTime.UtcNow;
                var channelWriter = context.Services.GetRequiredService<ChannelWriter<DeviceFlowAuthRequestedEvent>>();
                await channelWriter.WriteAsync(new DeviceFlowAuthRequestedEvent
                {
                    Agent = filter.agent,
                    ToolName = filter.tool,
                    Grant  = filter.grant,
                    User = filter.user,
                    TokenRequest = deviceTokenRequest,
                    Tool  = context.Params.Name,
                    Timestamp = now,
                    ConsentExpiration = now + TimeSpan.FromMinutes(
                        // toolPolicy.ExplicitConsentPolicy?.ConsentExpirationMinutes ??
                         10)

                }, token);
                
                
                

                return new CallToolResult
                {
                    IsError = true,
                    Content =
                    [
                        new TextContentBlock
                        {
                            Text = $"""
                                    User approval is required to activate this tool.
                                    In order to achieve the user consent, we're using OIDC device authorization flow.
                                    So in order to get access to this tool, prompt the user to visit the following link

                                    {authorize.VerificationUriComplete}
                                    """,
                            
                        }
                    ]
                };
            };
        };
    }
}