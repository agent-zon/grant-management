using System.Net;
using System.Text.RegularExpressions;
using GrantMcpLayer.Models;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Authentication;

namespace GrantMcpLayer.McpProxy;

public static class WebApplicationExtensions
{

    public static WebApplication UseMcpProxy(this WebApplication webApplication)
    {
        // webApplication.UseMiddleware<McpClientsCacheMiddleware>();
        
        webApplication.UseAuthentication();
        webApplication.UseAuthorization();

        webApplication.MapMcp()
            //.RequireAuthorization();
            ;
        
        return webApplication;
    }
}