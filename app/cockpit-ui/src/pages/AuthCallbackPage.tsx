import React, { useEffect, useState } from 'react';
import { BusyIndicator, MessageStrip } from '@ui5/webcomponents-react';
import { handleAuthCallback } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const redirect = await handleAuthCallback();
        navigate(typeof redirect === 'string' ? redirect : '/', { replace: true });
      } catch (e:any) {
        setError(e.message || 'Authentication processing failed');
        setTimeout(()=> navigate('/', { replace:true }), 4000);
      }
    })();
  }, [navigate]);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:'1rem' }}>
      <BusyIndicator active size="L" />
      {error && <MessageStrip design="Negative">{error}</MessageStrip>}
    </div>
  );
}
