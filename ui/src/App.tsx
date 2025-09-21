import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import Layout from './components/Layout';
import WorkloadsOverview from './pages/WorkloadsOverview';
import ChatPage from './pages/ChatPage';
import ConsentManagementPage from './pages/ConsentManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import CronPage from './pages/CronPage';
import ConsentPrompt from './components/ConsentPrompt';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentRequest, setConsentRequest] = useState<any>(null);
  const [authStatus] = useState({
    isAuthenticated: true,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiam9obi5zbWl0aCIsInJvbGUiOiJzZW5pb3ItYW5hbHlzdCIsImNvbXBhbnkiOiJhY21lLWNvcnAiLCJwZXJtaXNzaW9ucyI6WyJ0b29sczpleGVjdXRlIiwiYWdlbnRzOmNvbW11bmljYXRlIiwiYXBpczphY2Nlc3MiLCJ0b29sczpjcmVhdGUiXX0...',
    expiresIn: 3540,
    user: {
      name: 'John Smith',
      email: 'john.smith@acme-corp.com',
      role: 'Senior Business Analyst',
      department: 'Operations',
      company: 'ACME Corporation',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
    },
    permissions: ['tools:execute', 'agents:communicate', 'apis:access', 'tools:create', 'data:read', 'reports:generate']
  });

  const handleConsentRequest = (workloadId: string, scopes: string[]) => {
    setConsentRequest({
      id: `consent-${Date.now()}`,
      agentId: 'agent-A1',
      sessionId: 'S123',
      requestedScopes: scopes,
      tools: scopes.includes('tools:write') ? ['CreateFile', 'UpdateFile'] : ['ListFiles', 'ReadFile'],
      reason: `Background workload ${workloadId} requires additional permissions to continue execution.`,
      timestamp: new Date(),
      workloadId: workloadId
    });
  };

  const handleConsentApprove = (scopes: string[]) => {
    console.log('Consent approved for scopes:', scopes);
    
    if (consentRequest?.workloadId) {
      const event = new CustomEvent('consentApproved', {
        detail: {
          workloadId: consentRequest.workloadId,
          grantedScopes: scopes
        }
      });
      window.dispatchEvent(event);
    }
    
    setConsentRequest(null);
  };

  const handleConsentDeny = () => {
    console.log('Consent denied');
    setConsentRequest(null);
  };

  const handleConsentDismiss = () => {
    setConsentRequest(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Layout authStatus={authStatus}>
          <Routes>
            {/* Default redirect to workloads overview */}
            <Route path="/" element={<Navigate to="/workloads" replace />} />
            
            {/* Workloads overview */}
            <Route 
              path="/workloads" 
              element={
                <WorkloadsOverview 
                  onConsentRequest={handleConsentRequest}
                />
              } 
            />
            
            {/* Session-specific workload routes */}
            <Route 
              path="/workloads/:sessionId/chat" 
              element={
                <ChatPage 
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  authStatus={authStatus}
                  onConsentRequest={handleConsentRequest}
                />
              } 
            />
            <Route 
              path="/workloads/:sessionId/cron" 
              element={<CronPage />} 
            />
            <Route 
              path="/workloads/:sessionId/grants" 
              element={
                <ConsentManagementPage 
                  authStatus={authStatus}
                />
              } 
            />
            <Route 
              path="/workloads/:sessionId/audit" 
              element={<AuditLogPage />} 
            />
            
            {/* Global grants page */}
            <Route 
              path="/grants" 
              element={
                <ConsentManagementPage 
                  authStatus={authStatus}
                  showAllGrants={true}
                />
              } 
            />
            
            {/* Global audit log */}
            <Route 
              path="/audit" 
              element={<AuditLogPage />} 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/workloads" replace />} />
          </Routes>
        </Layout>

        {/* Consent Prompt Modal */}
        {consentRequest && (
          <ConsentPrompt
            request={consentRequest}
            onApprove={handleConsentApprove}
            onDeny={handleConsentDeny}
            onDismiss={handleConsentDismiss}
          />
        )}
      </div>
    </Router>
  );
}

export default App;