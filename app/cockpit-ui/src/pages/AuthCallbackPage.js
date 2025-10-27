import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BusyIndicator, MessageStrip } from '@ui5/webcomponents-react';
import { handleAuthCallback } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                const redirect = await handleAuthCallback();
                navigate(typeof redirect === 'string' ? redirect : '/', { replace: true });
            }
            catch (e) {
                setError(e.message || 'Authentication processing failed');
                setTimeout(() => navigate('/', { replace: true }), 4000);
            }
        })();
    }, [navigate]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }, children: [_jsx(BusyIndicator, { active: true, size: "L" }), error && _jsx(MessageStrip, { design: "Negative", children: error })] }));
}
