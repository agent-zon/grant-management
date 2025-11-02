using Microsoft.Net.Http.Headers;
using ModelContextProtocol.Authentication;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using MpcProxy.Common;

namespace GrantMcpLayer.unused.Auth;

public class ExternalAuth
{
    public static ClientOAuthOptions OAuth( HttpContext httpContext,McpServer server,
        CancellationToken cancellationToken)
    {
        return new ClientOAuthOptions
        {
            AdditionalAuthorizationParameters = new Dictionary<string, string>
            {
                { "state", Guid.NewGuid().ToString() }
            },
            RedirectUri =
                new Uri($"{httpContext.Request.Protocol}://{httpContext.Request.Host}/callback"),

            DynamicClientRegistration = new DynamicClientRegistrationOptions()
            {
                ClientName = "MCP Proxy",
                // ClientUri = new Uri(httpContext.Request.GetEncodedUrl())
            },


            AuthorizationRedirectDelegate = HandleAuthorizationUrlAsync
        };

        async Task<string?> HandleAuthorizationUrlAsync(Uri authorizationUrl, Uri redirectUri,
            CancellationToken authorizationCancellationToken)
        {
            //todo: use channel that resolved on callback endpoint, using state param to match
            // var channel = CodeChannel.New(HttpUtility.ParseQueryString(authorizationUrl.Query).Get("state") ?? throw new InvalidOperationException("No state param in auth url"));
            // var (code, error)= await channel.Reader.ReadAsync(cancellationToken);
            // Console.WriteLine($"Callback response code: {code} / error: {error}");
            // if (!string.IsNullOrEmpty(error))
            // {
            //     Console.WriteLine($"Auth error: {error}");
            //     return null;
            // }
            //
            // if (string.IsNullOrEmpty(code))
            // {
            //     Console.WriteLine("No authorization code received");
            //     return null;
            // }


            try
            {
                Console.WriteLine(
                    $"Listening for OAuth callback on: {redirectUri} , authorization URL: {authorizationUrl}");

                var elicitResult = await server.ElicitAsync(new ElicitRequestParams
                {
                    Message = string.Format(Consts.InternalProxy.Elicitations.AuthorizationUrlElicitationMessage,
                        authorizationUrl),
                    RequestedSchema = new ElicitRequestParams.RequestSchema
                    {
                        Properties = new Dictionary<string, ElicitRequestParams.PrimitiveSchemaDefinition>()
                        {
                            ["code"] = new ElicitRequestParams.StringSchema()
                        },
                        Required = ["code"]
                    }
                }, authorizationCancellationToken);


                var code = elicitResult is { Action: "accept", Content: not null } &&
                           elicitResult.Content.ContainsKey("code")
                    ? elicitResult.Content["code"].GetString()
                    : null;

                Console.WriteLine("Authorization code received successfully.code {0}", code);
                return code;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting auth code: {ex.Message}");
                return null;
            }
        }
    }
    
    public static async Task<string?> ElicitForToken(McpServer server, CancellationToken ct = default)
    {
        var elicitResult = await server.ElicitAsync(new()
        {
            Message = Consts.InternalProxy.Elicitations.AuthBearerElicitationMessage,
            RequestedSchema = new ElicitRequestParams.RequestSchema
            {
                Properties = new Dictionary<string, ElicitRequestParams.PrimitiveSchemaDefinition>()
                {
                    [HeaderNames.Authorization] = new ElicitRequestParams.StringSchema()
                }
            }
        }, ct);

        return elicitResult.Action == "accept" && elicitResult.Content != null &&
               elicitResult.Content.ContainsKey(HeaderNames.Authorization)
            ? elicitResult.Content[HeaderNames.Authorization].GetString()
            : null;
    }
}


/*

public class CodeChannel
{
    public static readonly ConcurrentDictionary<string, Channel<(string code, string error)>> Channels = new();

    public static Channel<(string code, string error)> New(string state)
    {
        var channel = Channel.CreateBounded<(string code, string error)>(1);
        Channels[state] = channel;
        return channel;
    }
    public static Channel<(string code, string error)> GetOrCreateChannel(string state)
    {
        return Channels.GetOrAdd(state, _ => Channel.CreateBounded<(string code, string error)>(1));
    }

}
*/