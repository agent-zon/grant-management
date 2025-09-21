import React, { useEffect } from 'react';
import { handleSilentRenew } from '../auth/AuthProvider';

// This page is loaded in a hidden iframe by oidc-client-ts for silent token renewal.
export default function SilentRenewPage() {
  useEffect(() => {
    handleSilentRenew().finally(() => {
      // Attempt to notify parent window that silent renew finished.
      if (window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'oidc-silent-renew-complete' }, '*'); } catch {}
      }
    });
  }, []);
  return <div style={{ fontFamily:'sans-serif', fontSize:12, color:'#666' }}>Renewing session…</div>;
}

