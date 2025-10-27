import React, { useEffect, useState, useCallback } from 'react';
import { Title, BusyIndicator, FlexBox, FlexBoxDirection, Toolbar, ToolbarSpacer, Select, Option, Button, MessageStrip, ObjectStatus } from '@ui5/webcomponents-react';
import { Api, listGrants, revokeGrant, formatDate } from '../api';
import { Grant, GrantStatus } from '../types';
import PageHeader from '../components/PageHeader';

const STATUS_OPTIONS: (GrantStatus | 'all')[] = ['active','expired','revoked','all'];

export default function GrantsPage() {
  const [status, setStatus] = useState<GrantStatus | 'all'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [revoking, setRevoking] = useState<string|undefined>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const data = await listGrants({ status });
      setGrants(data);
    } catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(()=>{ load(); }, [load]);

  const onRevoke = async (id:string) => {
    if (!window.confirm('Revoke this grant?')) return;
    setRevoking(id);
    try {
      await revokeGrant(id);
      await load();
    } catch (e:any) { setError(e.message); }
    finally { setRevoking(undefined); }
  };

  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ gap:'1.25rem' }}>
      <PageHeader title="Grants" subtitle="Manage active, expired or revoked grants" />
      <div className="card">
        <Toolbar design="Transparent" className="spaced-toolbar" style={{ margin:'-0.25rem 0 .5rem' }}>
          <Title level="H6">Filter</Title>
          <Select value={status} onChange={(e:any)=> setStatus(e.target.value)} style={{ width:'160px', marginLeft:'0.75rem' }}>
            {STATUS_OPTIONS.map(o => <Option key={o} data-key={o}>{o}</Option>)}
          </Select>
          <Button design="Transparent" icon="refresh" onClick={load} />
          <ToolbarSpacer />
          <span className="helper-text">{grants.length} grants</span>
        </Toolbar>
        {error && <MessageStrip design="Negative" style={{ marginBottom:'0.75rem' }} onClose={()=>setError(undefined)}>{error}</MessageStrip>}
        {loading ? <BusyIndicator active size="L" /> : (
          <div className="table-wrapper">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>Scope</th>
                  <th style={{width:140}}>Status</th>
                  <th style={{width:180}}>Created</th>
                  <th style={{width:180}}>Updated</th>
                  <th style={{width:180}}>Expires</th>
                  <th style={{width:120}}>Session</th>
                  <th style={{width:120}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map(g => (
                  <tr key={g.id}>
                    <td style={{whiteSpace:'pre-wrap'}}>{g.scope}</td>
                    <td>{renderStatusBadge(g.status)}</td>
                    <td>{formatDate(g.created_at)}</td>
                    <td>{formatDate(g.updated_at)}</td>
                    <td>{formatDate(g.expires_at)}</td>
                    <td>{g.session_id || '—'}</td>
                    <td>
                      <Button design="Negative" disabled={g.status!=='active' || revoking===g.id} onClick={()=>onRevoke(g.id)}>
                        {revoking===g.id? 'Revoking…':'Revoke'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {grants.length===0 && (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'1rem', color:'#666' }}>No grants match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FlexBox>
  );
}

function renderStatusBadge(s:GrantStatus) {
  const design = s==='active' ? 'Success' : s==='expired' ? 'Warning' : 'Neutral';
  return <ui5-badge color-scheme={design==='Success'?"8":design==='Warning'?"2":"1"}>{s}</ui5-badge>;
}
