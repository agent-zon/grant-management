import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BusyIndicator, Button, MessageStrip, FlexBox, FlexBoxDirection, Select, Option, Title, ObjectStatus } from '@ui5/webcomponents-react';
import { listGrantRequests, formatDate } from '../api';
import { GrantRequest } from '../types';
import PageHeader from '../components/PageHeader';

interface Props { agentId: string; }
const STATUS_OPTIONS = ['pending','approved','denied','expired','all'] as const;

// This page shows only "in process" (pending) grant requests that were created by an authorization (device) flow.
// Once the user finishes the device flow, the backend should convert the request into an actual Grant (removing or updating the request)
// so it will disappear here and the resulting Grant will appear on the Grants page.
export default function GrantRequestsPage({ agentId }: Props) {
  const [requests, setRequests] = useState<GrantRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending'|'approved'|'denied'|'expired'|'all'>('pending');
  const pollingRef = useRef<number | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listGrantRequests(statusFilter);
      let filtered = data.filter((r: GrantRequest) => (!agentId || r.agent_id === agentId));
      if (isMounted.current) {
        setRequests(filtered.sort((a: GrantRequest, b: GrantRequest)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLastUpdated(new Date());
      }
    } catch (e:any) {
      if (isMounted.current) setError(e.message || 'Failed to load grant requests');
    } finally { if (isMounted.current) setLoading(false); }
  }, [agentId, statusFilter]);

  useEffect(() => { isMounted.current = true; load(); return () => { isMounted.current = false; }; }, [load]);

  // Poll every 10s to catch status transitions
  useEffect(() => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(() => { load(); }, 10000);
    return () => { if (pollingRef.current) window.clearInterval(pollingRef.current); };
  }, [load]);

  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ gap:'1.25rem' }}>
      <PageHeader title="Grant Requests" subtitle={`Agent: ${agentId}`} />
      <div className="card" style={{ gap:'1rem' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
            <Title level="H6" style={{ margin:0 }}>Requests</Title>
            <Select style={{ width:'160px' }} onChange={(e: any) => {
              const opt = e.detail?.selectedOption as HTMLElement | undefined;
              const txt = opt?.textContent?.trim().toLowerCase() || 'pending';
              setStatusFilter(txt as any);
            }}>
              {STATUS_OPTIONS.map(s => <Option key={s} data-key={s} selected={s===statusFilter}>{s}</Option>)}
            </Select>
            <Button design="Transparent" icon="refresh" onClick={load} />
          </div>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
            {lastUpdated && <span className="helper-text">Updated: {lastUpdated.toLocaleTimeString()}</span>}
            <span className="helper-text">{requests.length} shown</span>
          </div>
        </div>
        {error && <MessageStrip design="Negative" style={{ marginTop:'0.5rem' }} onClose={()=>setError(null)}>{error}</MessageStrip>}
        {loading ? <BusyIndicator active size="L" /> : (
          requests.length === 0 ? (
            <MessageStrip design="Information">No grant requests match the current filter.</MessageStrip>
          ) : (
            <div className="table-wrapper">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{minWidth:140}}>Session</th>
                    <th style={{minWidth:160}}>Status</th>
                    <th style={{minWidth:200}}>Tools</th>
                    <th style={{minWidth:220}}>Requested Scopes</th>
                    <th style={{minWidth:160}}>Created</th>
                    <th style={{minWidth:160}}>Expires</th>
                    <th style={{minWidth:220}}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td>{r.session_id}</td>
                      <td><ObjectStatus state={r.status==='approved'? 'Positive': r.status==='denied'? 'Negative': r.status==='expired'? 'Critical':'None'}>{r.status}</ObjectStatus></td>
                      <td>{r.tools.join(', ')}</td>
                      <td>{r.requested_scopes.join(' ')}</td>
                      <td>{formatDate(r.created_at)}</td>
                      <td>{formatDate(r.expires_at)}</td>
                      <td style={{whiteSpace:'pre-wrap'}}>{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <div className="helper-text" style={{ marginTop:'0.75rem' }}>
          "Pending" shows device-flow authorization requests awaiting end-user completion. Completed or denied requests will move out of Pending and the resulting grants (if approved) appear on the Grants page.
        </div>
      </div>
    </FlexBox>
  );
}
