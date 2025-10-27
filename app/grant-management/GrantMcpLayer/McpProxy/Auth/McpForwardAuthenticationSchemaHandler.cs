using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace GrantMcpLayer.McpProxy.Auth;

public class McpForwardAuthenticationSchemaHandler : AuthenticationHandler<McpForwardAuthenticationSchemaOptions>
{
    public McpForwardAuthenticationSchemaHandler(
        IOptionsMonitor<McpForwardAuthenticationSchemaOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock) : base(options, logger, encoder, clock)
    { }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        try
        {
            var mcpClientResolver = Context.RequestServices.GetMcpClientResolver();
            var authHeader = Request.Headers.Authorization.ToString();
            await mcpClientResolver.ResolveAsync();
            
            var claims = new List<Claim>
            {
                new(ClaimTypes.Upn, authHeader)
            };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
        catch (HttpRequestException e) when (e.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // If the server returns Unauthorized, we return an empty result
            return AuthenticateResult.NoResult();
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return AuthenticateResult.Fail(e.Message);
        }
    }
}

public class McpForwardAuthenticationSchemaOptions : AuthenticationSchemeOptions
{

}