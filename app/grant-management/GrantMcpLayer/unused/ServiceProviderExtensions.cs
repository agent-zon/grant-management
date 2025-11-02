namespace GrantMcpLayer.unused;

public static class ServiceProviderExtensions
{
    public static IMcpClientResolver GetMcpClientResolver(this IServiceProvider services)
    {
        var httpContextAccessor = services.GetService<IHttpContextAccessor>();
        var clientResolver = httpContextAccessor?.HttpContext?.GetItem<McpClientResolver>();
        return clientResolver ?? services.GetRequiredService<IMcpClientResolver>();
    }
}