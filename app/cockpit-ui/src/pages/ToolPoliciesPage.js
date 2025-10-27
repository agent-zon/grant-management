import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { Button, Switch, Input, BusyIndicator, FlexBox, FlexBoxDirection, MessageStrip, Title, ObjectStatus, Dialog, Bar } from '@ui5/webcomponents-react';
import { listToolPolicies, createToolPolicy, updateToolPolicy, deleteToolPolicy, listGrantRequests } from '../api';
import PageHeader from '../components/PageHeader';
import '@ui5/webcomponents-icons/dist/add.js';
const DEFAULT_TOOLS = ['ListFiles', 'ReadFile', 'CreateFile', 'UpdateFile', 'DeleteFile', 'ExportData', 'GenerateReport', 'HttpRequest', 'ApiCall', 'ConfigureSystem', 'ManageUsers'];
export default function ToolPoliciesPage({ agentId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState();
    const [policies, setPolicies] = useState([]);
    const [draft, setDraft] = useState({ toolName: '', requiresExplicitConsent: false, consentExpirationMinutes: null });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState();
    const [toolUniverse, setToolUniverse] = useState(DEFAULT_TOOLS);
    const [showAdd, setShowAdd] = useState(false);
    const [addError, setAddError] = useState();
    const load = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const [policiesData, grantRequests] = await Promise.all([
                listToolPolicies(agentId),
                listGrantRequests().catch(() => []) // tolerate failure separately
            ]);
            setPolicies(policiesData.sort((a, b) => a.toolName.localeCompare(b.toolName)));
            const toolsFromGrants = Array.from(new Set(grantRequests
                .filter(r => r.agent_id === agentId)
                .flatMap(r => r.tools || [])));
            if (toolsFromGrants.length > 0)
                setToolUniverse(toolsFromGrants.sort());
            else
                setToolUniverse(DEFAULT_TOOLS);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, [agentId]);
    useEffect(() => { load(); }, [load]);
    const togglePolicy = async (p) => {
        const updated = { ...p, explicitConsentPolicy: { ...p.explicitConsentPolicy, requiresExplicitConsent: !p.explicitConsentPolicy.requiresExplicitConsent } };
        setPolicies(prev => prev.map(x => x.toolName === p.toolName ? updated : x));
        try {
            await updateToolPolicy(agentId, updated);
        }
        catch (e) {
            setError(e.message);
            load();
        }
    };
    const updateExpiration = async (p, minutes) => {
        const updated = { ...p, explicitConsentPolicy: { ...p.explicitConsentPolicy, consentExpirationMinutes: minutes } };
        setPolicies(prev => prev.map(x => x.toolName === p.toolName ? updated : x));
        try {
            await updateToolPolicy(agentId, updated);
        }
        catch (e) {
            setError(e.message);
            load();
        }
    };
    const removePolicy = async (p) => {
        setDeleting(p.toolName);
        try {
            await deleteToolPolicy(agentId, p.toolName);
            await load();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setDeleting(undefined);
        }
    };
    const availableTools = toolUniverse.filter(t => !policies.some(p => p.toolName.toLowerCase() === t.toLowerCase()));
    const isDuplicate = draft.toolName.trim() && policies.some(p => p.toolName.toLowerCase() === draft.toolName.trim().toLowerCase());
    const createDisabled = !draft.toolName.trim() || isDuplicate || saving;
    const resetDraft = () => { setDraft({ toolName: '', requiresExplicitConsent: false, consentExpirationMinutes: null }); setAddError(undefined); };
    const openAdd = () => { resetDraft(); setShowAdd(true); };
    const closeAdd = () => { setShowAdd(false); };
    const onCreate = async () => {
        if (createDisabled)
            return;
        if (isDuplicate) {
            setAddError('A policy with this tool name already exists.');
            return;
        }
        setSaving(true);
        setAddError(undefined);
        try {
            const policy = {
                agentId,
                toolName: draft.toolName.trim(),
                explicitConsentPolicy: {
                    requiresExplicitConsent: draft.requiresExplicitConsent,
                    consentExpirationMinutes: draft.requiresExplicitConsent ? (draft.consentExpirationMinutes ?? null) : null
                }
            };
            await createToolPolicy(agentId, policy);
            resetDraft();
            setShowAdd(false);
            await load();
        }
        catch (e) {
            setAddError(e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !createDisabled) {
            e.preventDefault();
            onCreate();
        }
    };
    return (_jsxs(FlexBox, { direction: FlexBoxDirection.Column, style: { gap: '1.25rem' }, children: [_jsx(PageHeader, { title: "Tool Activation Policies", subtitle: "Configure consent requirements per tool" }), error && _jsx(MessageStrip, { design: "Negative", style: { marginBottom: '0.5rem' }, onClose: () => setError(undefined), children: error }), _jsxs("div", { className: "card", style: { gap: '1rem' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Title, { level: "H6", style: { margin: 0 }, children: "Existing Policies" }), _jsxs("div", { style: { display: 'flex', gap: '.5rem' }, children: [_jsx(Button, { design: "Emphasized", icon: "add", onClick: openAdd, children: "Create New Policy" }), _jsx(Button, { design: "Transparent", icon: "refresh", onClick: load })] })] }), loading ? _jsx(BusyIndicator, { active: true, size: "L" }) : (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Tool" }), _jsx("th", { style: { width: '180px' }, children: "Explicit Consent" }), _jsx("th", { style: { width: '200px' }, children: "Expiration (min)" }), _jsx("th", { style: { width: '120px' }, children: "Actions" })] }) }), _jsxs("tbody", { children: [policies.map(p => (_jsxs("tr", { children: [_jsx("td", { children: p.toolName }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(Switch, { checked: p.explicitConsentPolicy.requiresExplicitConsent, onChange: () => togglePolicy(p) }), _jsx(ObjectStatus, { state: p.explicitConsentPolicy.requiresExplicitConsent ? 'Positive' : 'None', children: p.explicitConsentPolicy.requiresExplicitConsent ? 'yes' : 'no' })] }) }), _jsx("td", { children: p.explicitConsentPolicy.requiresExplicitConsent ? (_jsx(Input, { value: p.explicitConsentPolicy.consentExpirationMinutes?.toString() || '', placeholder: "minutes", type: "Number", style: { width: '120px' }, onChange: (e) => {
                                                            const val = e.target.value;
                                                            const n = val === '' ? null : parseInt(val, 10);
                                                            updateExpiration(p, isNaN(n) ? null : n);
                                                        } })) : _jsx("span", { style: { color: '#888' }, children: "\u2014" }) }), _jsx("td", { children: _jsx(Button, { design: "Negative", disabled: deleting === p.toolName, onClick: () => removePolicy(p), children: deleting === p.toolName ? 'Removing…' : 'Remove' }) })] }, p.toolName))), policies.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, style: { textAlign: 'center', padding: '1rem', color: '#666' }, children: "No policies" }) }))] })] }) }))] }), _jsx(Dialog, { open: showAdd, headerText: "Create New Policy", 
                // @ts-ignore onAfterClose not yet in type defs
                onAfterClose: closeAdd, footer: _jsx(Bar, { design: "Footer", endContent: _jsxs(_Fragment, { children: [_jsx(Button, { design: "Transparent", onClick: closeAdd, children: "Cancel" }), _jsx(Button, { design: "Emphasized", onClick: onCreate, disabled: createDisabled, children: saving ? 'Saving…' : 'Create' })] }) }), children: _jsxs(FlexBox, { direction: FlexBoxDirection.Column, style: { gap: '1rem', padding: '0.5rem 0' }, children: [addError && _jsx(MessageStrip, { design: "Negative", onClose: () => setAddError(undefined), children: addError }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }, children: "Tool Name" }), _jsx(Input, { value: draft.toolName, placeholder: "e.g. MyCustomTool", onInput: (e) => setDraft(d => ({ ...d, toolName: e.target.value })), onKeyDown: handleKeyDown }), _jsx("div", { style: { marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }, children: availableTools.slice(0, 8).map(t => (_jsx(Button, { design: "Transparent", style: { padding: '0 6px' }, onClick: () => setDraft(d => ({ ...d, toolName: t })), children: t }, t))) }), draft.toolName.trim() && (_jsx("div", { style: { marginTop: 6 }, children: isDuplicate ? _jsx(ObjectStatus, { state: "Negative", children: "Name already exists \u2013 choose another." }) : _jsx(ObjectStatus, { state: "Positive", children: "Will create new policy." }) }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1rem' }, children: [_jsx(Switch, { checked: draft.requiresExplicitConsent, onChange: () => setDraft(d => ({ ...d, requiresExplicitConsent: !d.requiresExplicitConsent })) }), _jsx("span", { children: "Requires explicit consent" })] }), draft.requiresExplicitConsent && (_jsxs("div", { children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }, children: "Consent Expiration (minutes)" }), _jsx(Input, { type: "Number", value: draft.consentExpirationMinutes?.toString() || '', placeholder: "e.g. 30", style: { width: '160px' }, onChange: (e) => { const val = e.target.value; const n = val === '' ? null : parseInt(val, 10); setDraft(d => ({ ...d, consentExpirationMinutes: isNaN(n) ? null : n })); }, onKeyDown: handleKeyDown })] }))] }) })] }));
}
