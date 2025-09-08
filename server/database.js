import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database types (converted from TypeScript interfaces to JSDoc comments)

// Initialize SQLite database
const db = new Database(path.join(__dirname, '../data/grants.db'));

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
const createTables = () => {
  // Grants table - stores OAuth grant information
  db.exec(`
    CREATE TABLE IF NOT EXISTS grants (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      grant_data TEXT, -- JSON data for additional grant details
      session_id TEXT,
      workload_id TEXT,
      UNIQUE(client_id, user_id, scope, session_id)
    )
  `);

  // Consent requests table - stores pending consent requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS consent_requests (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      requested_scopes TEXT NOT NULL, -- JSON array
      tools TEXT NOT NULL, -- JSON array
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      authorization_link TEXT,
      user_response TEXT, -- JSON object
      workload_id TEXT,
      reason TEXT
    )
  `);

  // Session tokens table - stores active session tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      scopes TEXT NOT NULL, -- JSON array
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      usage_count INTEGER DEFAULT 0,
      last_activity DATETIME,
      client_id TEXT NOT NULL
    )
  `);

  // Audit log table - stores grant management activities
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      grant_id TEXT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT, -- JSON object
      ip_address TEXT,
      user_agent TEXT
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_grants_client_user ON grants(client_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_grants_session ON grants(session_id);
    CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
    CREATE INDEX IF NOT EXISTS idx_consent_requests_status ON consent_requests(status);
    CREATE INDEX IF NOT EXISTS idx_session_tokens_session ON session_tokens(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_grant ON audit_log(grant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
  `);
};

// Initialize database
createTables();

// Prepared statements for better performance
const statements = {
  // Grant operations
  insertGrant: db.prepare(`
    INSERT INTO grants (id, client_id, user_id, scope, status, expires_at, grant_data, session_id, workload_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getGrant: db.prepare('SELECT * FROM grants WHERE id = ?'),
  
  getGrantsByClient: db.prepare('SELECT * FROM grants WHERE client_id = ? AND status = ?'),
  
  getGrantsBySession: db.prepare('SELECT * FROM grants WHERE session_id = ? AND status = ?'),
  
  getAllGrants: db.prepare('SELECT * FROM grants WHERE client_id = ?'),
  
  updateGrantStatus: db.prepare('UPDATE grants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  
  updateGrant: db.prepare(`
    UPDATE grants SET 
      scope = ?, 
      grant_data = ?, 
      updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  deleteGrant: db.prepare('DELETE FROM grants WHERE id = ?'),
  
  // Consent request operations
  insertConsentRequest: db.prepare(`
    INSERT INTO consent_requests (id, agent_id, session_id, requested_scopes, tools, expires_at, authorization_link, workload_id, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getConsentRequest: db.prepare('SELECT * FROM consent_requests WHERE id = ?'),
  
  getConsentRequestsByStatus: db.prepare('SELECT * FROM consent_requests WHERE status = ?'),
  
  updateConsentRequestStatus: db.prepare(`
    UPDATE consent_requests SET 
      status = ?, 
      user_response = ?, 
      updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  // Session token operations
  insertSessionToken: db.prepare(`
    INSERT INTO session_tokens (id, session_id, scopes, expires_at, client_id)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getSessionToken: db.prepare('SELECT * FROM session_tokens WHERE id = ?'),
  
  getSessionTokensBySession: db.prepare('SELECT * FROM session_tokens WHERE session_id = ? AND status = ?'),
  
  updateTokenUsage: db.prepare(`
    UPDATE session_tokens SET 
      usage_count = usage_count + 1, 
      last_activity = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  revokeSessionToken: db.prepare('UPDATE session_tokens SET status = ? WHERE id = ?'),
  
  // Audit log operations
  insertAuditLog: db.prepare(`
    INSERT INTO audit_log (id, grant_id, action, actor, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  
  getAuditLogs: db.prepare(`
    SELECT * FROM audit_log 
    WHERE (grant_id = ? OR ? IS NULL) 
    ORDER BY timestamp DESC 
    LIMIT ?
  `)
};

// Database service functions
export const GrantDatabase = {
  // Grant management
  createGrant: (clientId, userId, scope, sessionId, workloadId, expiresAt, grantData) => {
    const id = uuidv4();
    statements.insertGrant.run(
      id, clientId, userId, scope, 'active', 
      expiresAt, grantData ? JSON.stringify(grantData) : null, 
      sessionId, workloadId
    );
    
    // Log the creation
    GrantDatabase.logAction(id, 'create', userId, { scope, sessionId, workloadId });
    
    return { id };
  },

  getGrant: (grantId) => {
    const grant = statements.getGrant.get(grantId);
    return grant;
  },

  getGrantsByClient: (clientId, status = 'active') => {
    if (status === 'all') {
      return statements.getAllGrants.all(clientId);
    }
    return statements.getGrantsByClient.all(clientId, status);
  },

  getGrantsBySession: (sessionId, status = 'active') => {
    return statements.getGrantsBySession.all(sessionId, status);
  },

  updateGrantStatus: (grantId, status, actor) => {
    statements.updateGrantStatus.run(status, grantId);
    GrantDatabase.logAction(grantId, 'update_status', actor, { status });
  },

  updateGrant: (grantId, scope, grantData, actor) => {
    statements.updateGrant.run(
      scope, 
      grantData ? JSON.stringify(grantData) : null, 
      grantId
    );
    GrantDatabase.logAction(grantId, 'update', actor, { scope, grantData });
  },

  revokeGrant: (grantId, actor) => {
    statements.updateGrantStatus.run('revoked', grantId);
    GrantDatabase.logAction(grantId, 'revoke', actor);
  },

  deleteGrant: (grantId, actor) => {
    statements.deleteGrant.run(grantId);
    GrantDatabase.logAction(grantId, 'delete', actor);
  },

  // Consent request management
  createConsentRequest: (agentId, sessionId, requestedScopes, tools, workloadId, reason) => {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const authorizationLink = `/consent/${id}`;
    
    statements.insertConsentRequest.run(
      id, agentId, sessionId, 
      JSON.stringify(requestedScopes), 
      JSON.stringify(tools),
      expiresAt.toISOString(),
      authorizationLink,
      workloadId,
      reason
    );
    
    return { id, authorization_link: authorizationLink };
  },

  getConsentRequest: (requestId) => {
    const request = statements.getConsentRequest.get(requestId);
    return request;
  },

  getPendingConsentRequests: () => {
    return statements.getConsentRequestsByStatus.all('pending');
  },

  updateConsentRequest: (requestId, status, userResponse) => {
    statements.updateConsentRequestStatus.run(
      status, 
      userResponse ? JSON.stringify(userResponse) : null, 
      requestId
    );
  },

  // Session token management
  createSessionToken: (sessionId, scopes, clientId, expiresIn = 3600) => {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    statements.insertSessionToken.run(
      id, sessionId, JSON.stringify(scopes), expiresAt.toISOString(), clientId
    );
    
    return { id, expires_at: expiresAt };
  },

  getSessionToken: (tokenId) => {
    return statements.getSessionToken.get(tokenId);
  },

  getSessionTokensBySession: (sessionId, status = 'active') => {
    return statements.getSessionTokensBySession.all(sessionId, status);
  },

  updateTokenUsage: (tokenId) => {
    statements.updateTokenUsage.run(tokenId);
  },

  revokeSessionToken: (tokenId) => {
    statements.revokeSessionToken.run('revoked', tokenId);
  },

  // Audit logging
  logAction: (grantId, action, actor, details, ipAddress, userAgent) => {
    const id = uuidv4();
    statements.insertAuditLog.run(
      id, grantId, action, actor, 
      details ? JSON.stringify(details) : null, 
      ipAddress, userAgent
    );
  },

  getAuditLogs: (grantId, limit = 100) => {
    return statements.getAuditLogs.all(grantId, grantId, limit);
  },

  // Database maintenance
  cleanup: () => {
    // Remove expired consent requests
    db.exec(`
      DELETE FROM consent_requests 
      WHERE status = 'pending' AND expires_at < datetime('now')
    `);
    
    // Remove expired session tokens
    db.exec(`
      UPDATE session_tokens 
      SET status = 'expired' 
      WHERE status = 'active' AND expires_at < datetime('now')
    `);
    
    // Clean up old audit logs (keep last 10000 entries)
    db.exec(`
      DELETE FROM audit_log 
      WHERE id NOT IN (
        SELECT id FROM audit_log 
        ORDER BY timestamp DESC 
        LIMIT 10000
      )
    `);
  },

  // Close database connection
  close: () => {
    db.close();
  }
};

// Run cleanup every hour
setInterval(() => {
  GrantDatabase.cleanup();
}, 60 * 60 * 1000);

export default GrantDatabase;
