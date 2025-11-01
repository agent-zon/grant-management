using System.Threading.Channels;
using Duende.IdentityModel.Client;
using GrantMcpLayer.Models;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace GrantMcpLayer.Interceptors;

public class CallToolInterceptor
{
    public static McpRequestFilter<CallToolRequestParams, CallToolResult> Intercept()
    {
        return (next) =>
        {
            return async ValueTask<CallToolResult> (context, token) =>
            {
                var httpContextAccessor = context.Services.GetRequiredService<IHttpContextAccessor>();
                var dbContext = context.Services.GetRequiredService<AppDbContext>();
                if (dbContext.ToolActivationConsents.Any(x =>
                        x.AgentId == httpContextAccessor.HttpContext.ExtractAgentId() &&
                        x.ToolName == context.Params.Name &&
                        x.ConversationId == httpContextAccessor.HttpContext.ExtractConversationId() &&
                        x.UserId == httpContextAccessor.HttpContext.ExtractUserId() &&
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
                    HttpHeaders = httpContextAccessor.HttpContext.Request.Headers.DeepCopy(),
                    TokenRequest = deviceTokenRequest,
                    ToolName = context.Params.Name,
                    Timestamp = now,
                    ConsentExpiration = now + TimeSpan.FromMinutes(
                        // toolPolicy.ExplicitConsentPolicy?.ConsentExpirationMinutes ??
                         10)

                }, token);

                return new CallToolResult
                {
                    Content =
                    [
                        new TextContentBlock
                        {
                            Text = $"""
                                    User approval is required to activate this tool.
                                    In order to achieve the user consent, we're using OIDC device authorization flow.
                                    So in order to get access to this tool, prompt the user to visit the following link

                                    {authorize.VerificationUriComplete}
                                    """
                        }
                    ]
                };
            };
        };
    }
}