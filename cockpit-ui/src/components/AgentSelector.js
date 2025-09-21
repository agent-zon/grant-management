import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Title } from '@ui5/webcomponents-react';
const AGENT_OPTIONS = ['demo-agent', 'agent-alpha', 'agent-beta'];
export const AgentSelector = ({ agentId, onChange }) => {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(Title, { level: "H6", style: { margin: 0 }, children: "Agent:" }), _jsx("select", { value: agentId, onChange: e => onChange(e.target.value), style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #c2c8d0', background: '#fff' }, children: AGENT_OPTIONS.map(a => _jsx("option", { value: a, children: a }, a)) })] }));
};
export default AgentSelector;
