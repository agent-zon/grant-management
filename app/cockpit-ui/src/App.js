import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, ShellBar, SideNavigation, SideNavigationItem, BusyIndicator, Popover, Switch, Button, FlexBox, FlexBoxDirection } from '@ui5/webcomponents-react';
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
const NAV = [
    { key: 'policies', text: 'Tool Policies', path: '/', icon: 'task' },
    { key: 'grants', text: 'Grants', path: '/grants', icon: 'activities' },
    { key: 'grant-requests', text: 'Grant Requests', path: '/grant-requests', icon: 'action-settings' }
];
export default function App() {
    return (_jsx(ThemeProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallbackPage, {}) }), _jsx(Route, { path: "/auth/silent-renew", element: _jsx(SilentRenewPage, {}) }), _jsx(Route, { path: "/*", element: _jsx(ProtectedApp, {}) })] }) }));
}
function ProtectedApp() {
    const { user, loading, isOidcConfigured } = useAuth();
    if (isOidcConfigured && loading)
        return _jsx(FullscreenLoading, {});
    if (isOidcConfigured && !loading && !user)
        return _jsx(LoginPage, {});
    return _jsx(AppShell, {});
}
function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [agentId, setAgentId] = useState('demo-agent');
    const [prefsOpen, setPrefsOpen] = useState(false);
    const [densityCompact, setDensityCompact] = useState(() => { try {
        return localStorage.getItem('ui:density') === 'compact';
    }
    catch {
        return false;
    } });
    const [dark, setDark] = useState(() => { try {
        return localStorage.getItem('ui:dark') === '1';
    }
    catch {
        return false;
    } });
    useEffect(() => { document.body.classList.toggle('compact', densityCompact); try {
        localStorage.setItem('ui:density', densityCompact ? 'compact' : 'cozy');
    }
    catch { } ; }, [densityCompact]);
    useEffect(() => { const theme = dark ? 'sap_horizon_dark' : 'sap_horizon'; document.documentElement.setAttribute('data-ui5-theme', theme); document.body.classList.toggle('dark-theme', dark); try {
        localStorage.setItem('ui:dark', dark ? '1' : '0');
    }
    catch { } ; }, [dark]);
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
                const k = e.key.toLowerCase();
                if (k === 'd') {
                    e.preventDefault();
                    setDensityCompact(d => !d);
                }
            }
            else if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                setDark(d => !d);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    const currentKey = NAV.find(n => n.path === location.pathname)?.key || 'policies';
    const onSelectionChange = (e) => {
        const key = e.detail?.item?.dataset?.key;
        const item = NAV.find(n => n.key === key);
        if (item)
            navigate(item.path);
    };
    return (_jsxs("div", { className: "app-shell", style: { height: '100%' }, children: [_jsxs("div", { className: "sidebar-panel", children: [_jsxs("div", { className: "brand-area", style: { justifyContent: 'flex-start', position: 'relative' }, children: [_jsx("div", { className: "brand-icon", children: "GM" }), _jsxs("div", { className: "brand-titles", children: [_jsx("div", { className: "product-name", children: "Grant Management" }), _jsx("div", { className: "product-sub", children: "Cockpit" })] })] }), _jsx(SideNavigation, { style: { flex: 1 }, onSelectionChange: onSelectionChange, children: NAV.map(item => (_jsx(SideNavigationItem, { icon: item.icon, text: item.text, "data-key": item.key, selected: item.key === currentKey, title: item.text }, item.key))) })] }), _jsxs("div", { className: "shell-content", children: [_jsxs(ShellBar, { className: "app-shell-bar", primaryTitle: "Grant Management", secondaryTitle: "Cockpit", showNotifications: true, showProductSwitch: false, onLogoClick: () => navigate('/'), onProfileClick: () => logout(), children: [_jsx("div", { slot: "profile", style: { cursor: 'pointer' }, "aria-label": "Logout", title: "Logout", children: "\uD83D\uDC64" }), _jsx("div", { slot: "startButton", style: { display: 'flex', gap: '.25rem' }, children: _jsx(Button, { design: "Transparent", icon: "action-settings", "aria-label": "Preferences (Ctrl+D density, Shift+Ctrl+L theme)", onClick: () => setPrefsOpen(o => !o) }) })] }), _jsx("div", { className: "app-shell-content", children: _jsxs("div", { className: "content-container", style: { display: 'flex', flexDirection: 'column', gap: '1.25rem' }, children: [_jsx(Breadcrumbs, {}), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }, children: _jsx(AgentSelector, { agentId: agentId, onChange: setAgentId }) }), _jsx(Suspense, { fallback: _jsx(BusyIndicator, { active: true, size: "L" }), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ToolPoliciesPage, { agentId: agentId }) }), _jsx(Route, { path: "/grants", element: _jsx(GrantsPage, {}) }), _jsx(Route, { path: "/grant-requests", element: _jsx(GrantRequestsPage, { agentId: agentId }) })] }) })] }) }), _jsx(PreferencesPopover, { open: prefsOpen, onClose: () => setPrefsOpen(false), densityCompact: densityCompact, setDensityCompact: setDensityCompact, dark: dark, setDark: setDark })] })] }));
}
function FullscreenLoading() {
    return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }, children: _jsx(BusyIndicator, { active: true, size: "L" }) }));
}
const PreferencesPopover = ({ open, onClose, densityCompact, setDensityCompact, dark, setDark }) => {
    const [opener, setOpener] = useState(null);
    useEffect(() => { const btn = document.querySelector('ui5-button[icon="action-settings"]'); if (btn)
        setOpener(btn); }, [open]);
    if (!opener)
        return null;
    return (_jsx(Popover, { open: open, opener: opener, placement: "Bottom", style: { padding: '0.75rem', width: '260px' }, 
        // @ts-ignore UI5 Popover supports onAfterClose event though not in current type defs
        onAfterClose: () => onClose(), children: _jsxs(FlexBox, { direction: FlexBoxDirection.Column, style: { gap: '0.75rem' }, children: [_jsx("div", { style: { fontWeight: 600 }, children: "Preferences" }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '.5rem' }, children: [_jsx(Switch, { checked: densityCompact, onChange: () => setDensityCompact(!densityCompact), accessibleName: "Toggle compact density" }), _jsx("span", { style: { fontSize: 14 }, children: "Compact Density" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '.5rem' }, children: [_jsx(Switch, { checked: dark, onChange: () => setDark(!dark), accessibleName: "Toggle dark theme" }), _jsx("span", { style: { fontSize: 14 }, children: "Dark Theme" })] }), _jsx("div", { style: { fontSize: 12, color: '#5a6370', lineHeight: 1.4 }, children: "Shortcuts: Ctrl/Cmd+D density, Shift+Ctrl/Cmd+L theme." })] }) }));
};
