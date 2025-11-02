namespace GrantMcpLayer.unused.Session;

public class McpClientsCacheMiddleware(IServiceProvider serviceProvider) : IMiddleware 
{
    const string SessionHeader = "mcp-session-id";
    
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var sessionHeader = context.Request.Headers[SessionHeader].ToString();
        var authHeader = context.Request.Headers["Authorization"].ToString();
        Task selectedFlow = context.Request.Method switch
        {
            "OPTIONS" => next(context),
            "DELETE" => HandleDelete(sessionHeader, authHeader, context, next),
            _ => HandleRequest(serviceProvider, sessionHeader, authHeader, context, next)
        };
        
        await selectedFlow;
    }

    private static async Task HandleRequest(IServiceProvider appServiceProvider, string sessionHeader, string authHeader, HttpContext context, RequestDelegate next)
    {
        var sessionManager = context.RequestServices.GetRequiredService<IMcpClientSessionsStorage>();
        
        try
        {
            if (string.IsNullOrEmpty(sessionHeader))
            {
                var clientResolver = ActivatorUtilities.CreateInstance<McpClientResolver>(appServiceProvider);
                context.AddItem(clientResolver);
                await next(context);
                if (!string.IsNullOrEmpty(context.Response.Headers[SessionHeader]) && clientResolver.IsInitialized)
                    await sessionManager.CreateSession(sessionHeader, new Session(authHeader, clientResolver));
                else
                {
                    context.RemoveItem<McpClientResolver>();
                    await clientResolver.DisposeAsync();
                }
            }
            else
            {
                var session = await sessionManager.TryGetClientForSession(sessionHeader);
                if (session != null && session.AuthHeader == authHeader)
                {
                    context.AddItem(session.McpClientResolver);
                    await next(context);
                }
                else
                {
                    try
                    {
                        var clientResolver = ActivatorUtilities.CreateInstance<McpClientResolver>(appServiceProvider);
                        if (!await sessionManager.CreateSession(sessionHeader, new Session(authHeader, clientResolver)))
                            clientResolver = (await sessionManager.TryGetClientForSession(sessionHeader))?.McpClientResolver ?? clientResolver;

                        context.AddItem(clientResolver);
                        await next(context);
                    }
                    catch (Exception e)
                    {
                        await sessionManager.RemoveSession(sessionHeader);
                        throw;
                    }
                }
            }
        }
        finally
        {
            context.RemoveItem<McpClientResolver>();
        }
    }

    private static async Task HandleDelete(string sessionHeader, string authHeader, HttpContext context, RequestDelegate next)
    {
        if (string.IsNullOrEmpty(sessionHeader))
        {
            await next(context);
            return;
        }

        var sessionManager = context.RequestServices.GetRequiredService<IMcpClientSessionsStorage>();
        try
        {
            var session = await sessionManager.TryGetClientForSession(sessionHeader);
            if (session != null && session.AuthHeader == authHeader)
                context.AddItem(session.McpClientResolver);
            
            await next(context);
        }
        finally
        {
            context.RemoveItem<McpClientResolver>();
            await sessionManager.RemoveSession(sessionHeader);
        }
    }
}