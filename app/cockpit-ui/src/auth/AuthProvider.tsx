import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';
import { setAccessToken, registerUnauthorizedHandler } from '../api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error?: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
  ensureAuthenticated: () => void;
  isOidcConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let userManager: UserManager | null = null;

function buildUserManager(): UserManager | null {
  const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined;
  const client_id = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
  if (!authority || !client_id) return null;
  const redirect_uri = window.location.origin + '/auth/callback';
  const silent_redirect_uri = window.location.origin + '/auth/silent-renew';
  return new UserManager({
    authority,
    client_id,
    redirect_uri,
    silent_redirect_uri,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    automaticSilentRenew: true,
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    post_logout_redirect_uri: window.location.origin + '/',
  });
}

const DEFAULT_REFRESH_LEEWAY_SEC = Number(import.meta.env.VITE_TOKEN_REFRESH_LEEWAY ?? 60);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const isOidcConfigured = !!userManager;

  if (userManager === null) {
    userManager = buildUserManager();
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userManager) { setLoading(false); return; }
      try {
        const existing = await userManager.getUser();
        if (mounted) setUser(existing);
      } catch (e:any) {
        if (mounted) setError(e.message);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setAccessToken(user?.access_token || null);
  }, [user]);

  useEffect(() => {
    if (!userManager) return;
    registerUnauthorizedHandler(async () => {
      try {
        const refreshed = await userManager!.signinSilent();
        setUser(refreshed);
        setAccessToken(refreshed?.access_token || null);
        return true;
      } catch {
        setUser(null);
        setAccessToken(null);
        return false;
      }
    });
  }, []);

  // Proactive silent renew scheduling
  useEffect(() => {
    if (!userManager || !user) return;
    const expMs = (user.expires_at ?? 0) * 1000;
    const now = Date.now();
    const leewayMs = DEFAULT_REFRESH_LEEWAY_SEC * 1000;
    const renewAt = expMs - leewayMs;

    const doRenew = async () => {
      try {
        const refreshed = await userManager!.signinSilent();
        setUser(refreshed);
        setAccessToken(refreshed?.access_token || null);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    };

    if (renewAt <= now) {
      // Already within leeway – renew immediately
      doRenew();
      return;
    }

    const timeoutId = window.setTimeout(doRenew, renewAt - now);
    return () => window.clearTimeout(timeoutId);
  }, [user]);

  const login = useCallback(async () => {
    if (!userManager) { setError('OIDC not configured'); return; }
    await userManager.signinRedirect({ state: window.location.pathname + window.location.search });
  }, []);

  const logout = useCallback(async () => {
    if (!userManager) return;
    await userManager.signoutRedirect();
  }, []);

  const getAccessToken = useCallback(() => user?.access_token || null, [user]);

  const ensureAuthenticated = useCallback(() => {
    if (!isOidcConfigured) return; // treat as open mode
    if (!loading && !user) login();
  }, [loading, user, login, isOidcConfigured]);

  const value: AuthContextValue = { user, loading, error, login, logout, getAccessToken, ensureAuthenticated, isOidcConfigured };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function handleAuthCallback(): Promise<string | undefined> {
  if (!userManager) return '/';
  const result = await userManager.signinRedirectCallback();
  return (result?.state as string) || '/';
}

export async function handleSilentRenew() {
  if (!userManager) return;
  try { await userManager.signinSilentCallback(); } catch { /* ignore */ }
}
