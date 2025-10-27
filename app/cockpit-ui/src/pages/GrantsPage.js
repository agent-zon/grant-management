import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { Title, BusyIndicator, FlexBox, FlexBoxDirection, Toolbar, ToolbarSpacer, Select, Option, Button, MessageStrip } from '@ui5/webcomponents-react';
import { listGrants, revokeGrant, formatDate } from '../api';
import PageHeader from '../components/PageHeader';
const STATUS_OPTIONS = ['active', 'expired', 'revoked', 'all'];
export default function GrantsPage() {
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState();
    const [grants, setGrants] = useState([]);
    const [revoking, setRevoking] = useState();
    const load = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const data = await listGrants({ status });
            setGrants(data);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, [status]);
    useEffect(() => { load(); }, [load]);
    const onRevoke = async (id) => {
        if (!window.confirm('Revoke this grant?'))
            return;
        setRevoking(id);
        try {
            await revokeGrant(id);
            await load();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setRevoking(undefined);
        }
    };
    return (_jsxs(FlexBox, { direction: FlexBoxDirection.Column, style: { gap: '1.25rem' }, children: [_jsx(PageHeader, { title: "Grants", subtitle: "Manage active, expired or revoked grants" }), _jsxs("div", { className: "card", children: [_jsxs(Toolbar, { design: "Transparent", className: "spaced-toolbar", style: { margin: '-0.25rem 0 .5rem' }, children: [_jsx(Title, { level: "H6", children: "Filter" }), _jsx(Select, { value: status, onChange: (e) => setStatus(e.target.value), style: { width: '160px', marginLeft: '0.75rem' }, children: STATUS_OPTIONS.map(o => _jsx(Option, { "data-key": o, children: o }, o)) }), _jsx(Button, { design: "Transparent", icon: "refresh", onClick: load }), _jsx(ToolbarSpacer, {}), _jsxs("span", { className: "helper-text", children: [grants.length, " grants"] })] }), error && _jsx(MessageStrip, { design: "Negative", style: { marginBottom: '0.75rem' }, onClose: () => setError(undefined), children: error }), loading ? _jsx(BusyIndicator, { active: true, size: "L" }) : (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Scope" }), _jsx("th", { style: { width: 140 }, children: "Status" }), _jsx("th", { style: { width: 180 }, children: "Created" }), _jsx("th", { style: { width: 180 }, children: "Updated" }), _jsx("th", { style: { width: 180 }, children: "Expires" }), _jsx("th", { style: { width: 120 }, children: "Session" }), _jsx("th", { style: { width: 120 }, children: "Actions" })] }) }), _jsxs("tbody", { children: [grants.map(g => (_jsxs("tr", { children: [_jsx("td", { style: { whiteSpace: 'pre-wrap' }, children: g.scope }), _jsx("td", { children: renderStatusBadge(g.status) }), _jsx("td", { children: formatDate(g.created_at) }), _jsx("td", { children: formatDate(g.updated_at) }), _jsx("td", { children: formatDate(g.expires_at) }), _jsx("td", { children: g.session_id || '—' }), _jsx("td", { children: _jsx(Button, { design: "Negative", disabled: g.status !== 'active' || revoking === g.id, onClick: () => onRevoke(g.id), children: revoking === g.id ? 'Revoking…' : 'Revoke' }) })] }, g.id))), grants.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { textAlign: 'center', padding: '1rem', color: '#666' }, children: "No grants match the current filter." }) }))] })] }) }))] })] }));
}
function renderStatusBadge(s) {
    const design = s === 'active' ? 'Success' : s === 'expired' ? 'Warning' : 'Neutral';
    return _jsx("ui5-badge", { "color-scheme": design === 'Success' ? "8" : design === 'Warning' ? "2" : "1", children: s });
}
