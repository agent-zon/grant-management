import React, { useEffect, useState, useCallback } from 'react';
import { Button, Switch, Input, BusyIndicator, FlexBox, FlexBoxDirection, MessageStrip, Title, ObjectStatus, Dialog, Bar } from '@ui5/webcomponents-react';
import { listToolPolicies, createToolPolicy, updateToolPolicy, deleteToolPolicy, listGrantRequests } from '../api';
import { ToolPolicy } from '../types';
import PageHeader from '../components/PageHeader';
import '@ui5/webcomponents-icons/dist/add.js';

interface Props { agentId: string; }
interface DraftPolicy { toolName: string; requiresExplicitConsent: boolean; consentExpirationMinutes: number | null; }

const DEFAULT_TOOLS = ['ListFiles','ReadFile','CreateFile','UpdateFile','DeleteFile','ExportData','GenerateReport','HttpRequest','ApiCall','ConfigureSystem','ManageUsers'];

export default function ToolPoliciesPage({ agentId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [policies, setPolicies] = useState<ToolPolicy[]>([]);
  const [draft, setDraft] = useState<DraftPolicy>({ toolName:'', requiresExplicitConsent:false, consentExpirationMinutes:null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|undefined>();
  const [toolUniverse, setToolUniverse] = useState<string[]>(DEFAULT_TOOLS);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState<string|undefined>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const [policiesData, grantRequests] = await Promise.all([
        listToolPolicies(agentId),
        listGrantRequests().catch(()=>[]) // tolerate failure separately
      ]);
      setPolicies(policiesData.sort((a,b)=>a.toolName.localeCompare(b.toolName)));
      const toolsFromGrants = Array.from(new Set(
        grantRequests
          .filter(r => r.agent_id === agentId)
          .flatMap(r => r.tools || [])
      ));
      if (toolsFromGrants.length > 0) setToolUniverse(toolsFromGrants.sort()); else setToolUniverse(DEFAULT_TOOLS);
    } catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [agentId]);

  useEffect(()=>{ load(); }, [load]);

  const togglePolicy = async (p:ToolPolicy) => {
    const updated: ToolPolicy = { ...p, explicitConsentPolicy: { ...p.explicitConsentPolicy, requiresExplicitConsent: !p.explicitConsentPolicy.requiresExplicitConsent } };
    setPolicies(prev => prev.map(x => x.toolName === p.toolName ? updated : x));
    try { await updateToolPolicy(agentId, updated); } catch (e:any) { setError(e.message); load(); }
  };

  const updateExpiration = async (p:ToolPolicy, minutes:number|null) => {
    const updated: ToolPolicy = { ...p, explicitConsentPolicy: { ...p.explicitConsentPolicy, consentExpirationMinutes: minutes } };
    setPolicies(prev => prev.map(x => x.toolName === p.toolName ? updated : x));
    try { await updateToolPolicy(agentId, updated); } catch (e:any) { setError(e.message); load(); }
  };

  const removePolicy = async (p:ToolPolicy) => {
    setDeleting(p.toolName);
    try { await deleteToolPolicy(agentId, p.toolName); await load(); }
    catch(e:any){ setError(e.message); }
    finally { setDeleting(undefined); }
  };

  const availableTools = toolUniverse.filter(t => !policies.some(p => p.toolName.toLowerCase() === t.toLowerCase()));
  const isDuplicate = draft.toolName.trim() && policies.some(p => p.toolName.toLowerCase() === draft.toolName.trim().toLowerCase());
  const createDisabled = !draft.toolName.trim() || isDuplicate || saving;

  const resetDraft = () => { setDraft({ toolName:'', requiresExplicitConsent:false, consentExpirationMinutes:null }); setAddError(undefined); };
  const openAdd = () => { resetDraft(); setShowAdd(true); };
  const closeAdd = () => { setShowAdd(false); };

  const onCreate = async () => {
    if (createDisabled) return;
    if (isDuplicate) { setAddError('A policy with this tool name already exists.'); return; }
    setSaving(true); setAddError(undefined);
    try {
      const policy: ToolPolicy = {
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
    } catch (e:any) { setAddError(e.message); }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !createDisabled) { e.preventDefault(); onCreate(); }
  };

  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ gap:'1.25rem' }}>
      <PageHeader title="Tool Activation Policies" subtitle="Configure consent requirements per tool" />
      {error && <MessageStrip design="Negative" style={{ marginBottom:'0.5rem' }} onClose={()=>setError(undefined)}>{error}</MessageStrip>}
      <div className="card" style={{ gap:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Title level="H6" style={{ margin:0 }}>Existing Policies</Title>
          <div style={{ display:'flex', gap:'.5rem' }}>
            <Button design="Emphasized" icon="add" onClick={openAdd}>Create New Policy</Button>
            <Button design="Transparent" icon="refresh" onClick={load} />
          </div>
        </div>
        {loading ? <BusyIndicator active size="L" /> : (
          <div className="table-wrapper">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th style={{ width:'180px' }}>Explicit Consent</th>
                  <th style={{ width:'200px' }}>Expiration (min)</th>
                  <th style={{ width:'120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <tr key={p.toolName}>
                    <td>{p.toolName}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <Switch checked={p.explicitConsentPolicy.requiresExplicitConsent} onChange={()=>togglePolicy(p)} />
                        <ObjectStatus state={p.explicitConsentPolicy.requiresExplicitConsent? 'Positive':'None'}>
                          {p.explicitConsentPolicy.requiresExplicitConsent? 'yes':'no'}
                        </ObjectStatus>
                      </div>
                    </td>
                    <td>
                      {p.explicitConsentPolicy.requiresExplicitConsent ? (
                        <Input
                          value={p.explicitConsentPolicy.consentExpirationMinutes?.toString() || ''}
                          placeholder="minutes"
                          type="Number"
                          style={{ width:'120px' }}
                          onChange={(e:any)=>{
                            const val = e.target.value; const n = val === '' ? null : parseInt(val,10); updateExpiration(p, isNaN(n as any)? null : n);
                          }}
                        />
                      ) : <span style={{ color:'#888' }}>—</span>}
                    </td>
                    <td>
                      <Button design="Negative" disabled={deleting===p.toolName} onClick={()=>removePolicy(p)}>{deleting===p.toolName? 'Removing…':'Remove'}</Button>
                    </td>
                  </tr>
                ))}
                {policies.length===0 && (
                  <tr><td colSpan={4} style={{ textAlign:'center', padding:'1rem', color:'#666' }}>No policies</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Policy Dialog */}
      <Dialog
        open={showAdd}
        headerText="Create New Policy"
        // @ts-ignore onAfterClose not yet in type defs
        onAfterClose={closeAdd}
        footer={<Bar design="Footer" endContent={<>
          <Button design="Transparent" onClick={closeAdd}>Cancel</Button>
          <Button design="Emphasized" onClick={onCreate} disabled={createDisabled}>{saving? 'Saving…':'Create'}</Button>
        </>} />}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap:'1rem', padding:'0.5rem 0' }}>
          {addError && <MessageStrip design="Negative" onClose={()=>setAddError(undefined)}>{addError}</MessageStrip>}
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Tool Name</label>
            <Input value={draft.toolName} placeholder="e.g. MyCustomTool" onInput={(e:any)=>setDraft(d=>({...d, toolName:e.target.value}))} onKeyDown={handleKeyDown} />
            <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:4 }}>
              {availableTools.slice(0,8).map(t => (
                <Button key={t} design="Transparent" style={{ padding:'0 6px' }} onClick={()=>setDraft(d=>({...d, toolName:t }))}>{t}</Button>
              ))}
            </div>
            {draft.toolName.trim() && (
              <div style={{ marginTop:6 }}>
                {isDuplicate ? <ObjectStatus state="Negative">Name already exists – choose another.</ObjectStatus> : <ObjectStatus state="Positive">Will create new policy.</ObjectStatus>}
              </div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <Switch checked={draft.requiresExplicitConsent} onChange={()=>setDraft(d=>({...d, requiresExplicitConsent: !d.requiresExplicitConsent }))} />
            <span>Requires explicit consent</span>
          </div>
          {draft.requiresExplicitConsent && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Consent Expiration (minutes)</label>
              <Input
                type="Number"
                value={draft.consentExpirationMinutes?.toString() || ''}
                placeholder="e.g. 30"
                style={{ width:'160px' }}
                onChange={(e:any)=>{ const val = e.target.value; const n = val === '' ? null : parseInt(val,10); setDraft(d=>({...d, consentExpirationMinutes: isNaN(n as any)? null : n })); }}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}
        </FlexBox>
      </Dialog>
    </FlexBox>
  );
}
