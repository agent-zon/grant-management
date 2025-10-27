import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  ThemeProvider,
  ShellBar,
  SideNavigation,
  SideNavigationItem,
  BusyIndicator,
  Popover,
  Switch,
  Button,
  FlexBox,
  FlexBoxDirection
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents/dist/Avatar.js';
import '@ui5/webcomponents-icons/dist/task.js';
import '@ui5/webcomponents-icons/dist/activities.js';
import '@ui5/webcomponents-icons/dist/action-settings.js';

import { useAuth } from './auth/AuthProvider';
import Breadcrumbs from './components/Breadcrumbs';
import AgentSelector from './components/AgentSelector';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SilentRenewPage from './pages/SilentRenewPage';

const ToolPoliciesPage = React.lazy(() => import('./pages/ToolPoliciesPage'));
const GrantsPage = React.lazy(() => import('./pages/GrantsPage'));
const GrantRequestsPage = React.lazy(() => import('./pages/GrantRequestsPage'));

interface NavItem { key: string; text: string; path: string; icon: string; }
const NAV: NavItem[] = [
  { key: 'policies', text: 'Tool Policies', path: '/', icon: 'task' },
  { key: 'grants', text: 'Grants', path: '/grants', icon: 'activities' },
  { key: 'grant-requests', text: 'Grant Requests', path: '/grant-requests', icon: 'action-settings' }
];

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/silent-renew" element={<SilentRenewPage />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </ThemeProvider>
  );
}

function ProtectedApp() {
  const { user, loading, isOidcConfigured } = useAuth();
  if (isOidcConfigured && loading) return <FullscreenLoading />;
  if (isOidcConfigured && !loading && !user) return <LoginPage />;
  return <AppShell />;
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [agentId, setAgentId] = useState('demo-agent');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [densityCompact, setDensityCompact] = useState(() => { try { return localStorage.getItem('ui:density') === 'compact'; } catch { return false; } });
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('ui:dark') === '1'; } catch { return false; } });

  useEffect(() => { document.body.classList.toggle('compact', densityCompact); try { localStorage.setItem('ui:density', densityCompact ? 'compact' : 'cozy'); } catch {}; }, [densityCompact]);
  useEffect(() => { const theme = dark ? 'sap_horizon_dark' : 'sap_horizon'; document.documentElement.setAttribute('data-ui5-theme', theme); document.body.classList.toggle('dark-theme', dark); try { localStorage.setItem('ui:dark', dark ? '1':'0'); } catch {}; }, [dark]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'd') { e.preventDefault(); setDensityCompact(d => !d); }
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault(); setDark(d => !d);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const currentKey = NAV.find(n => n.path === location.pathname)?.key || 'policies';
  const onSelectionChange = (e: any) => {
    const key = e.detail?.item?.dataset?.key;
    const item = NAV.find(n => n.key === key);
    if (item) navigate(item.path);
  };

  return (
    <div className="app-shell" style={{ height: '100%' }}>
      <div className="sidebar-panel">
        <div className="brand-area" style={{ justifyContent: 'flex-start', position:'relative' }}>
          <div className="brand-icon">GM</div>
          <div className="brand-titles">
            <div className="product-name">Grant Management</div>
            <div className="product-sub">Cockpit</div>
          </div>
        </div>
        <SideNavigation style={{ flex: 1 }} onSelectionChange={onSelectionChange}>
          {NAV.map(item => (
            <SideNavigationItem
              key={item.key}
              icon={item.icon}
              text={item.text}
              data-key={item.key}
              selected={item.key === currentKey}
              title={item.text}
            />
          ))}
        </SideNavigation>
      </div>
      <div className="shell-content">
        <ShellBar
          className="app-shell-bar"
          primaryTitle="Grant Management"
          secondaryTitle="Cockpit"
          showNotifications
          showProductSwitch={false}
          onLogoClick={() => navigate('/')}
          onProfileClick={() => logout()}
        >
          <div slot="profile" style={{ cursor: 'pointer' }} aria-label="Logout" title="Logout">👤</div>
          <div slot="startButton" style={{ display: 'flex', gap: '.25rem' }}>
            <Button design="Transparent" icon="action-settings" aria-label="Preferences (Ctrl+D density, Shift+Ctrl+L theme)" onClick={() => setPrefsOpen(o => !o)} />
          </div>
        </ShellBar>
        <div className="app-shell-content">
          <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Breadcrumbs />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <AgentSelector agentId={agentId} onChange={setAgentId} />
            </div>
            <Suspense fallback={<BusyIndicator active size="L" />}>            
              <Routes>
                <Route path="/" element={<ToolPoliciesPage agentId={agentId} />} />
                <Route path="/grants" element={<GrantsPage />} />
                <Route path="/grant-requests" element={<GrantRequestsPage agentId={agentId} />} />
              </Routes>
            </Suspense>
          </div>
        </div>
        <PreferencesPopover
          open={prefsOpen}
          onClose={() => setPrefsOpen(false)}
          densityCompact={densityCompact}
          setDensityCompact={setDensityCompact}
          dark={dark}
          setDark={setDark}
        />
      </div>
    </div>
  );
}

function FullscreenLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <BusyIndicator active size="L" />
    </div>
  );
}

interface PreferencesPopoverProps { open: boolean; onClose: () => void; densityCompact: boolean; setDensityCompact: (v: boolean) => void; dark: boolean; setDark: (v: boolean) => void; }
const PreferencesPopover: React.FC<PreferencesPopoverProps> = ({ open, onClose, densityCompact, setDensityCompact, dark, setDark }) => {
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  useEffect(() => { const btn = document.querySelector('ui5-button[icon="action-settings"]') as HTMLElement | null; if (btn) setOpener(btn); }, [open]);
  if (!opener) return null;
  return (
    <Popover
      open={open}
      opener={opener as any}
      placement="Bottom"
      style={{ padding: '0.75rem', width: '260px' }}
      // @ts-ignore UI5 Popover supports onAfterClose event though not in current type defs
      onAfterClose={() => onClose()}
    >
      <FlexBox direction={FlexBoxDirection.Column} style={{ gap: '0.75rem' }}>
        <div style={{ fontWeight: 600 }}>Preferences</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Switch checked={densityCompact} onChange={() => setDensityCompact(!densityCompact)} accessibleName="Toggle compact density" />
          <span style={{ fontSize: 14 }}>Compact Density</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Switch checked={dark} onChange={() => setDark(!dark)} accessibleName="Toggle dark theme" />
          <span style={{ fontSize: 14 }}>Dark Theme</span>
        </label>
        <div style={{ fontSize: 12, color: '#5a6370', lineHeight: 1.4 }}>
          Shortcuts: Ctrl/Cmd+D density, Shift+Ctrl/Cmd+L theme.
        </div>
      </FlexBox>
    </Popover>
  );
};
