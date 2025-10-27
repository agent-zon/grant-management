import React from 'react';
import { Title } from '@ui5/webcomponents-react';

export interface AgentSelectorProps {
  agentId: string;
  onChange: (v: string) => void;
}

const AGENT_OPTIONS = ['demo-agent','agent-alpha','agent-beta'];

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agentId, onChange }) => {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
      <Title level="H6" style={{ margin:0 }}>Agent:</Title>
      <select value={agentId} onChange={e=>onChange(e.target.value)} style={{ padding:'4px 8px', borderRadius:4, border:'1px solid #c2c8d0', background:'#fff' }}>
        {AGENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
};

export default AgentSelector;

