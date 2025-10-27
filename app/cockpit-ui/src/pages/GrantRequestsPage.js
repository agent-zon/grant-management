import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from 'react';
import { BusyIndicator, Button, MessageStrip, FlexBox, FlexBoxDirection, Select, Option, Title, ObjectStatus } from '@ui5/webcomponents-react';
import { listGrantRequests, formatDate } from '../api';
import PageHeader from '../components/PageHeader';
const STATUS_OPTIONS = ['pending', 'approved', 'denied', 'expired', 'all'];
// This page shows only "in process" (pending) grant requests that were created by an authorization (device) flow.
// Once the user finishes the device flow, the backend should convert the request into an actual Grant (removing or updating the request)
// so it will disappear here and the resulting Grant will appear on the Grants page.
export default function GrantRequestsPage({ agentId }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const pollingRef = useRef(null);
    const isMounted = useRef(true);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listGrantRequests(statusFilter);
            let filtered = data.filter((r) => (!agentId || r.agent_id === agentId));
            if (isMounted.current) {
                setRequests(filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                setLastUpdated(new Date());
            }
        }
        catch (e) {
            if (isMounted.current)
                setError(e.message || 'Failed to load grant requests');
        }
        finally {
            if (isMounted.current)
                setLoading(false);
        }
    }, [agentId, statusFilter]);
    useEffect(() => { isMounted.current = true; load(); return () => { isMounted.current = false; }; }, [load]);
    // Poll every 10s to catch status transitions
    useEffect(() => {
        if (pollingRef.current)
            window.clearInterval(pollingRef.current);
        pollingRef.current = window.setInterval(() => { load(); }, 10000);
        return () => { if (pollingRef.current)
            window.clearInterval(pollingRef.current); };
    }, [load]);
    return (_jsxs(FlexBox, { direction: FlexBoxDirection.Column, style: { gap: '1.25rem' }, children: [_jsx(PageHeader, { title: "Grant Requests", subtitle: `Agent: ${agentId}` }), _jsxs("div", { className: "card", style: { gap: '1rem' }, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }, children: [_jsx(Title, { level: "H6", style: { margin: 0 }, children: "Requests" }), _jsx(Select, { style: { width: '160px' }, onChange: (e) => {
                                            const opt = e.detail?.selectedOption;
                                            const txt = opt?.textContent?.trim().toLowerCase() || 'pending';
                                            setStatusFilter(txt);
                                        }, children: STATUS_OPTIONS.map(s => _jsx(Option, { "data-key": s, selected: s === statusFilter, children: s }, s)) }), _jsx(Button, { design: "Transparent", icon: "refresh", onClick: load })] }), _jsxs("div", { style: { display: 'flex', gap: '1rem', flexWrap: 'wrap' }, children: [lastUpdated && _jsxs("span", { className: "helper-text", children: ["Updated: ", lastUpdated.toLocaleTimeString()] }), _jsxs("span", { className: "helper-text", children: [requests.length, " shown"] })] })] }), error && _jsx(MessageStrip, { design: "Negative", style: { marginTop: '0.5rem' }, onClose: () => setError(null), children: error }), loading ? _jsx(BusyIndicator, { active: true, size: "L" }) : (requests.length === 0 ? (_jsx(MessageStrip, { design: "Information", children: "No grant requests match the current filter." })) : (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { minWidth: 140 }, children: "Session" }), _jsx("th", { style: { minWidth: 160 }, children: "Status" }), _jsx("th", { style: { minWidth: 200 }, children: "Tools" }), _jsx("th", { style: { minWidth: 220 }, children: "Requested Scopes" }), _jsx("th", { style: { minWidth: 160 }, children: "Created" }), _jsx("th", { style: { minWidth: 160 }, children: "Expires" }), _jsx("th", { style: { minWidth: 220 }, children: "Reason" })] }) }), _jsx("tbody", { children: requests.map(r => (_jsxs("tr", { children: [_jsx("td", { children: r.session_id }), _jsx("td", { children: _jsx(ObjectStatus, { state: r.status === 'approved' ? 'Positive' : r.status === 'denied' ? 'Negative' : r.status === 'expired' ? 'Critical' : 'None', children: r.status }) }), _jsx("td", { children: r.tools.join(', ') }), _jsx("td", { children: r.requested_scopes.join(' ') }), _jsx("td", { children: formatDate(r.created_at) }), _jsx("td", { children: formatDate(r.expires_at) }), _jsx("td", { style: { whiteSpace: 'pre-wrap' }, children: r.reason || '—' })] }, r.id))) })] }) }))), _jsx("div", { className: "helper-text", style: { marginTop: '0.75rem' }, children: "\"Pending\" shows device-flow authorization requests awaiting end-user completion. Completed or denied requests will move out of Pending and the resulting grants (if approved) appear on the Grants page." })] })] }));
}
