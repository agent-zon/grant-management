using System.Net;
using System.Security.Claims;
using System.Text.RegularExpressions;
using GrantMcpLayer.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ModelContextProtocol.Authentication;

namespace GrantMcpLayer.McpProxy;

public static class Auth
{
    private static readonly Regex resourceMetadataUrlRegex = new("resource_metadata=\"(?<url>[^\"]+)\"", RegexOptions.Compiled);

    public static IMcpServerBuilder WithAuthForwarding(this IMcpServerBuilder mcpServerBuilder, string authority, string? audience = null)
    {
        // Configure JWT Bearer authentication
        mcpServerBuilder.Services.AddAuthentication(options =>
            {
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                if (!string.IsNullOrEmpty(authority))
                {
                    options.Authority = authority;
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidAudience = audience,
                    ValidIssuer = authority,
                    NameClaimType = "name",
                    RoleClaimType = "roles"
                };

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var name = context.Principal?.Identity?.Name ?? "unknown";
                        var email = context.Principal?.FindFirstValue("preferred_username") ?? "unknown";
                        Console.WriteLine($"Token validated for: {name} ({email})");
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnChallenge = context =>
                    {
                        Console.WriteLine($"Challenging client to authenticate");
                        return Task.CompletedTask;
                    }
                };
            }).AddMcp(options =>
            {
                options.ResourceMetadata = new()
                {
                    Resource = new Uri("http://localhost:5283"),
                    ResourceDocumentation = new Uri("https://docs.example.com/api/weather"),
                    AuthorizationServers = { new Uri(authority) },
                    ScopesSupported = ["openid"],
                };
            });
        
        mcpServerBuilder.Services.AddAuthorization();
        
        return mcpServerBuilder;
    }

    public static IMcpServerBuilder WithNoAuth(this IMcpServerBuilder mcpServerBuilder)
    {
        mcpServerBuilder.Services.AddAuthentication(options =>
            {
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
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