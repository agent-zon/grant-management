import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Card, CardHeader, Title, BusyIndicator, MessageStrip } from '@ui5/webcomponents-react';
import { useAuth } from '../auth/AuthProvider';
export default function LoginPage() {
    const { login, loading, error, isOidcConfigured } = useAuth();
    return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }, children: _jsx(Card, { style: { maxWidth: 480, width: '100%' }, header: _jsx(CardHeader, { titleText: "Sign In", subtitleText: isOidcConfigured ? 'Secure Access' : 'OIDC Disabled - Open Mode' }), children: _jsxs("div", { style: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsx(Title, { level: "H5", children: "MCP Grant Management Cockpit" }), error && _jsx(MessageStrip, { design: "Negative", children: error }), !isOidcConfigured && _jsx(MessageStrip, { design: "Information", children: "OIDC environment variables not set. Proceeding without authentication." }), loading ? _jsx(BusyIndicator, { active: true, size: "M" }) : (isOidcConfigured ? _jsx(Button, { design: "Emphasized", onClick: login, children: "Sign in with Identity Provider" }) : _jsx(MessageStrip, { design: "Positive", children: "You are in open mode. Navigate using the side menu." }))] }) }) }));
}
