namespace MpcProxy.Common;

public static class Consts
{
    public static class McpTransportTypes
    {
        public const string Sse = "sse";
        public const string Http = "http";
        public const string Stdio = "stdio";
    }
    
    public static class InternalProxy
    {
        public const string InternalProxyPrefix = "___INTERNAL_PROXY___";

        public static class ToolsNames
        {
            public const string Authenticate = $"{InternalProxyPrefix}TryAuthenticate";
        }
        public static class ResourcesNames
        {
            public const string ProtectedResourceMetadata = $"{InternalProxyPrefix}ProtectedResourceMetadata";
        }
        
        public static class Elicitations
        {
            public const string AuthBearerElicitationMessage = $"{InternalProxyPrefix}: Please provide the authentication bearer token";
        }
    }
}