using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace GrantMcpLayer.McpProxy;

public class AllowAllSchemaHandler(
    IOptionsMonitor<AllowAllSchemaOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ISystemClock clock) : AuthenticationHandler<AllowAllSchemaOptions>(options, logger, encoder, clock)
{
    private const string Scheme = "AllowAll";
    private static AuthenticationTicket _ticket = new(new ClaimsPrincipal(new ClaimsIdentity([], Scheme)), Scheme);

    protected override Task<AuthenticateResult> HandleAuthenticateAsync() =>
        Task.FromResult(AuthenticateResult.Success(_ticket));
    
}

public class AllowAllSchemaOptions : AuthenticationSchemeOptions
{
}