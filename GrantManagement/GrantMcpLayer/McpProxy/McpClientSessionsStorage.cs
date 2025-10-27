using System.Collections.Concurrent;

namespace GrantMcpLayer.McpProxy;

public interface IMcpClientSessionsStorage
{
    ValueTask<Session?> TryGetClientForSession(string sessionId);
    ValueTask<bool> CreateSession(string sessionId, Session services);
    ValueTask RemoveSession(string sessionId, Session? expectedValue = null);
    
    KeyValuePair<string, Session>[] GetAllSessions();
}

public class McpClientSessionsStorage : IMcpClientSessionsStorage
{
    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    
    public ValueTask<Session?> TryGetClientForSession(string sessionId)
    {
        var session = _sessions.GetValueOrDefault(sessionId);
        if (session == null)
            return ValueTask.FromResult<Session?>(null);
        
        var updatedSession = session with {};
        _sessions.TryUpdate(sessionId, updatedSession, session);
        
        return ValueTask.FromResult<Session?>(updatedSession);
    }
    public ValueTask<bool> CreateSession(string sessionId, Session session) =>
        ValueTask.FromResult(_sessions.TryAdd(sessionId, session));

    public async ValueTask RemoveSession(string sessionId, Session? expectedValue = null)
    {
        Session? removedSession = null;
        if (expectedValue != null)
        {
            var pair = KeyValuePair.Create(sessionId, expectedValue!);
            if (_sessions.TryRemove(pair))
                removedSession = pair.Value;
        }
        else
            _sessions.TryRemove(sessionId, out removedSession);
            
        if (removedSession != null) 
            await removedSession.McpClientResolver.DisposeAsync();
    }

    public KeyValuePair<string, Session>[] GetAllSessions() => _sessions.ToArray();
}

public record Session
{
    public string AuthHeader { get; }
    public McpClientResolver McpClientResolver { get; }
    public DateTime LastAccessed { get; }
    
    public Session(string authHeader, McpClientResolver mcpClientResolver) : this(authHeader, mcpClientResolver, DateTime.UtcNow)
    {
    }

    private Session(string authHeader, McpClientResolver mcpClientResolver, DateTime created)
    {
        AuthHeader = authHeader;
        McpClientResolver = mcpClientResolver;
        LastAccessed = created;
    }
}