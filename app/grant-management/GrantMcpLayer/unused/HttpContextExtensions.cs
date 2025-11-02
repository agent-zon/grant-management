using System.IdentityModel.Tokens.Jwt;
using System.Net;
using GrantMcpLayer.McpProxy;
using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;

namespace GrantMcpLayer;

public static class HttpContextExtensions
{
    public static bool AddItem<T>(this HttpContext context, T value) =>
        context.Items.TryAdd(typeof(T).FullName!, value);

    public static T? GetItem<T>(this HttpContext context) =>
        context.Items.TryGetValue(typeof(T).FullName!, out var value) ? (T)value! : default;

    public static bool RemoveItem<T>(this HttpContext context) =>
        context.Items.Remove(typeof(T).FullName!);
}