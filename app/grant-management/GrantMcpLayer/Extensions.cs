using System.IdentityModel.Tokens.Jwt;
using System.Net;
using GrantMcpLayer.McpProxy;
using GrantMcpLayer.McpProxy.Auth;
using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;
using ModelContextProtocol.AspNetCore.Authentication;

namespace GrantMcpLayer;

public static class TaskExtensions
{
    public static async Task<(Guid TaskKey, IHeaderDictionary headers, T Result)> WithTaskKeyAndHttpHeaders<T>(this Task<T> task, 
        Guid taskKey, 
        IHeaderDictionary headers)
    {
        var result = await task;
        return (taskKey, headers, result);
    }
}

public static class HttpContextExtensions
{
    public static string? ExtractAgentId(this HttpContext context) =>
        context.Request.Headers.ExtractAgentId();

    public static string? ExtractConversationId(this HttpContext context) =>
        context.Request.Headers.ExtractConversationId();

    public static string? ExtractUserId(this HttpContext context) =>
        context.User?.Identity?.Name ??
        context.Request.Headers.ExtractUserId();
        
    

    public static JwtSecurityToken ExtractJwtFromAuthorization(this HttpContext context) =>
        context.Request.Headers.ExtractJwtFromAuthorization();
    
    public static bool AddItem<T>(this HttpContext context, T value) =>
        context.Items.TryAdd(typeof(T).FullName!, value);
    
    public static T? GetItem<T>(this HttpContext context) =>
        context.Items.TryGetValue(typeof(T).FullName!, out var value) ?
            (T)value! : 
            default;
    
    public static bool RemoveItem<T>(this HttpContext context) =>
        context.Items.Remove(typeof(T).FullName!);
}

public static class ServiceProviderExtensions
{
    public static IMcpClientResolver GetMcpClientResolver(this IServiceProvider services)
    {
        var httpContextAccessor = services.GetService<IHttpContextAccessor>();
        var clientResolver = httpContextAccessor?.HttpContext?.GetItem<McpClientResolver>();
        return clientResolver ?? services.GetRequiredService<IMcpClientResolver>();
    }
}

public static class HeadersDictionaryExtensions
{
    public static string? ExtractConversationId(this IHeaderDictionary headers)
    {
        var jwt = headers.ExtractJwtFromAuthorization();
        return jwt?.Id ?? "default-conversation-id";
    }

    public static string ExtractAgentId(this IHeaderDictionary headers)
    {
        var jwtToken = headers.ExtractJwtFromAuthorization();
        return jwtToken?.Claims?.FirstOrDefault(c => c.Type == "client_id")?.Value ??
               "default-agent-id";
    }
    
    public static string ExtractUserId(this IHeaderDictionary headers)
    {
        var jwtToken = headers.ExtractJwtFromAuthorization();
        return jwtToken?.Subject ?? "default-user-id";
    }
    
    public static JwtSecurityToken? ExtractJwtFromAuthorization(this IHeaderDictionary headers)
    {
        var authHeader = headers.Authorization.FirstOrDefault();
        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader["Bearer ".Length..].Trim()
            : authHeader;

        var handler = new JwtSecurityTokenHandler();
        return handler.CanReadToken(token) ?
            handler.ReadJwtToken(token) :
            null;
    }
    
    public static HeaderDictionary DeepCopy(this IHeaderDictionary source)
    {
        var copy = new HeaderDictionary();
        foreach (var header in source)
        {
            copy[header.Key] = header.Value.ToArray();
        }
        
        return copy;
    }
}