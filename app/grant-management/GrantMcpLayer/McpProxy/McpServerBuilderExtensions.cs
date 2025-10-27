using System.Net;
using System.Text.RegularExpressions;
using GrantMcpLayer.McpProxy.Auth;
using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;
using ModelContextProtocol.AspNetCore.Authentication;
using ModelContextProtocol.Authentication;

namespace GrantMcpLayer.McpProxy;

public static class McpServerBuilderExtensions
{
    private static readonly Regex resourceMetadataUrlRegex = new("resource_metadata=\"(?<url>[^\"]+)\"", RegexOptions.Compiled);

    public static IMcpServerBuilder WithAuthForwarding(this IMcpServerBuilder mcpServerBuilder)
    {
        mcpServerBuilder.Services.AddAuthentication(options =>
            {
                options.DefaultChallengeScheme = McpAuthenticationDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = "Forwarder";
            })
            .AddScheme<McpForwardAuthenticationSchemaOptions, McpForwardAuthenticationSchemaHandler>("Forwarder", options => { })
            .AddMcp(options =>
            {
                options.Events.OnResourceMetadataRequest = async context =>
                {
                    var httpClientFactory = context.HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
                    var targetInfoSnapshot = context.HttpContext.RequestServices.GetRequiredService<IOptions<McpServerInfo>>();
                    var ct = context.HttpContext.RequestAborted;
                    
                    var resourceProtectedMetadata = await ResolveProtectedResourceMetadata(httpClientFactory, targetInfoSnapshot.Value, ct);
                    if (resourceProtectedMetadata is null)
                    {
                        context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                    else
                    {
                        resourceProtectedMetadata.Resource = new Uri($"{context.HttpContext.Request.Scheme}://{context.HttpContext.Request.Host}");
                        context.Response.StatusCode = (int)HttpStatusCode.OK;
                        await context.HttpContext.Response.WriteAsJsonAsync(resourceProtectedMetadata, ct);
                    }
                    
                    context.HandleResponse();
                };
            });
        mcpServerBuilder.Services.AddAuthorization();
        
        return mcpServerBuilder;
    }

    public static IMcpServerBuilder WithNoAuth(this IMcpServerBuilder mcpServerBuilder)
    {
        mcpServerBuilder.Services.AddAuthentication(options =>
            {
                options.DefaultChallengeScheme = McpAuthenticationDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = "AllowAll";
            })
            .AddScheme<AllowAllSchemaOptions, AllowAllSchemaHandler>("AllowAll", options => { })
            .AddMcp(options =>
            {
                options.Events.OnResourceMetadataRequest = context =>
                {
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    context.HandleResponse();
                    return Task.CompletedTask;
                };
            });
        mcpServerBuilder.Services.AddAuthorization();

        return mcpServerBuilder;
    }

    private static async Task<ProtectedResourceMetadata?> ResolveProtectedResourceMetadata(IHttpClientFactory httpClientFactory, McpServerInfo targetInfo, CancellationToken ct)
    {
        var httpClient = httpClientFactory.CreateClient("McpProxy");
        
        // 1. Make a request to the MCP endpoint to get the WWW-Authenticate header
        var mcpResponse = await httpClient.GetAsync(targetInfo.Url, ct);
        if (mcpResponse is not { StatusCode: HttpStatusCode.Unauthorized, Headers.WwwAuthenticate.Count: > 0 }) 
            return null;
        
        
        // Try to extract the authorization_uri from the WWW-Authenticate header
        var wwwAuth = mcpResponse.Headers.WwwAuthenticate.ToString();
        // Example: Bearer authorization_uri="https://auth.example.com", ...
        var match = resourceMetadataUrlRegex.Match(wwwAuth);
        if (match.Success)
        {
            var protectedResourceMetadataUrl = match.Groups["url"].Value;
            var response = await httpClient.GetAsync(protectedResourceMetadataUrl, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            return await response.Content.ReadFromJsonAsync<ProtectedResourceMetadata>(ct);
        }

        return null;
    }
}