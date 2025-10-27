import React from 'react';
import { Button, Card, CardHeader, Title, BusyIndicator, MessageStrip } from '@ui5/webcomponents-react';
import { useAuth } from '../auth/AuthProvider';

export default function LoginPage() {
  const { login, loading, error, isOidcConfigured } = useAuth();
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', padding:'2rem' }}>
      <Card style={{ maxWidth:480, width:'100%' }} header={<CardHeader titleText="Sign In" subtitleText={isOidcConfigured ? 'Secure Access' : 'OIDC Disabled - Open Mode'} />}>        
        <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          <Title level="H5">MCP Grant Management Cockpit</Title>
          {error && <MessageStrip design="Negative">{error}</MessageStrip>}
          {!isOidcConfigured && <MessageStrip design="Information">OIDC environment variables not set. Proceeding without authentication.</MessageStrip>}
          {loading ? <BusyIndicator active size="M" /> : (
            isOidcConfigured ? <Button design="Emphasized" onClick={login}>Sign in with Identity Provider</Button> : <MessageStrip design="Positive">You are in open mode. Navigate using the side menu.</MessageStrip>
          )}
        </div>
      </Card>
    </div>
  );
}
