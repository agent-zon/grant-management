import React from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Key,
  Lock,
  Unlock,
  ArrowLeft,
  Activity,
  Calendar,
  User,
  AlertTriangle,
  Eye,
  Settings,
  Database,
  Globe
} from 'lucide-react';
import { Form, useLoaderData, useActionData, Link } from 'react-router';
import type { Route } from './+types/grants.$id._index.ts';
import { grants } from "../grants.db.ts";


export function meta({ data}: Route.MetaArgs) {
  const grant = data?.grant;
  return [
    { title: `Consent Details - ${grant?.scope || 'Unknown'}` },
    { name: "description", content: `Manage consent for ${grant?.scope || 'permission'}` },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  const grant = grants.find(g => g.id === id);
  
  if (!grant) {
    throw new Response('Consent grant not found', { status: 404 });
  }

  return { grant };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { id } = params;
  const data = await request.json(); // Extracts the JSON body
  const item=grants.find(g => g.id === id);
  if(item) {
    item.granted = data.granted;
    item.grantedAt = data.grantedAt;
    item.expiresAt = data.expiresAt;
    item.sessionId = data.sessionId;
  }
  return item;


}

export default function GrantDetail({ loaderData }: Route.ComponentProps) {
  const { grant } = loaderData;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'file-system': return <Database className="w-5 h-5" />;
      case 'data-access': return <Eye className="w-5 h-5" />;
      case 'system-admin': return <Settings className="w-5 h-5" />;
      case 'network': return <Globe className="w-5 h-5" />;
      case 'analytics': return <Activity className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };
 
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Link
              to="/grants"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Consent Management</span>
            </Link>
          </div> 
           {/* Main Consent Details */}
           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className={`p-3 rounded-lg ${grant.granted ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {getCategoryIcon(grant.category)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{grant.scope}</h1>
                <p className="text-gray-400">{grant.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className={`flex items-center space-x-2 px-2 py-1 rounded border ${getRiskColor(grant.riskLevel)}`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium capitalize">{grant.riskLevel} Risk</span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{grant.category.replace('-', ' ')} Category</span>
                </div>
              </div>
            </div>

           
            {/* Risk Assessment */}
            {grant.riskLevel === 'high' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400">High Risk Permission</h4>
                    <p className="text-xs text-red-300 mt-1">
                      This permission grants access to sensitive system functions. Please review carefully 
                      before granting access. Consider using time-limited grants for enhanced security.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
          {/* Current Status */}
          <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 mb-6 ${
            grant.granted 
              ? 'border-green-500/30' 
              : 'border-red-500/30'
          }`}>
            <div className={`flex items-center justify-between ${
              grant.granted 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              <div className="flex items-center space-x-3">
                {grant.granted ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                <div>
                  <p className="text-lg font-medium">
                    {grant.granted ? 'Access Granted' : 'Access Denied'}
                  </p>
                  {grant.granted && grant.grantedAt && (
                    <p className="text-sm opacity-80">
                      Since {new Date(grant.grantedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div> 
              
            </div>
         

          {/* Current Status Details */} 
          {grant.granted && (
              <> 
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4"> 
                  <div>
                   {grant.expiresAt &&new Date(grant.expiresAt ) < new Date()?
                    <p className={`text-sm text-green-300'
                    }`}>
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      {new Date(grant.expiresAt ).toLocaleString()}
                    </p>
                    : grant.expiresAt && new Date(grant.expiresAt ) > new Date() ?
                    <p className={`text-sm text-red-300'
                    }`}>
                      <XCircle className="w-6 h-6 text-red-400" />
                      {new Date(grant.expiresAt ).toLocaleString()}
                    </p>
                    :
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-sm text-green-300">This permission is currently granted and active</p>
                      </div>
                    </div> 
                  }
                </div> 
                <div>
                  <p className="text-xs text-green-400 font-medium">Active Session</p>
                  <p className="text-sm text-green-300 font-mono">
                    {grant.sessionId || 'None'}
                  </p>
                </div>
              </div>

              {/* Quick Revoke */}
              <div className="mt-4 pt-4 border-t border-green-600/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-300">Need to revoke access?</p>
                  <Link
                    to={`/grants/${grant.id}/revoke`}
                    className="text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Revoke Access →
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Not Granted Status */}
          {!grant.granted && (
            <> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">  
              <div className="mt-4 pt-4 border-t border-green-600/30">
                <p className="text-sm text-red-300">Ready to grant access?</p>
                <Link
                  to={`/grants/${grant.id}/grant`}
                  className="text-sm text-green-400 hover:text-green-300 underline"
                >
                  Grant Access →
                </Link>
              </div>
            </div>
            </>
          )}
        </div>
         
 
          {/* Security Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 container flex flex-row gap-6">
         
            <div className="bg-gray-900/50 backdrop-blur-sm  border-gray-700 p-6">

            <h3 className="text-lg font-medium text-white mb-4">Security Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">What this permission allows:</h4>
                <ul className="space-y-1">
                  {grant.toolsIncluded.map((tool, idx) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span>{tool} - {
                        tool.includes('Read') ? 'View and access files' :
                        tool.includes('Create') ? 'Create new files and data' :
                        tool.includes('Update') || tool.includes('Modify') ? 'Modify existing files' :
                        tool.includes('Delete') ? 'Remove files and data' :
                        tool.includes('Export') ? 'Export and download data' :
                        tool.includes('Generate') ? 'Create reports and analysis' :
                        tool.includes('System') ? 'Access system settings' :
                        tool.includes('Config') ? 'Modify configuration' :
                        'General tool operations'
                      }</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Security considerations:</h4>
                <ul className="space-y-1">
                  {grant.riskLevel === 'high' && (
                    <>
                      <li className="text-sm text-red-300 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                        <span>High-privilege access to system functions</span>
                      </li>
                      <li className="text-sm text-red-300 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                        <span>Can affect system stability and security</span>
                      </li>
                    </>
                  )}
                  {grant.riskLevel === 'medium' && (
                    <>
                      <li className="text-sm text-yellow-300 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                        <span>Moderate access to user data and files</span>
                      </li>
                      <li className="text-sm text-yellow-300 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                        <span>Consider time-limited grants</span>
                      </li>
                    </>
                  )}
                  {grant.riskLevel === 'low' && (
                    <li className="text-sm text-green-300 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                      <span>Low-risk read-only access</span>
                    </li>
                  )}
                  <li className="text-sm text-gray-400 flex items-center space-x-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>All actions are logged and auditable</span>
                  </li>
                  <li className="text-sm text-gray-400 flex items-center space-x-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>Permission can be revoked at any time</span>
                  </li>
                </ul>
              </div>
            </div>
           
         </div>

            {/* Grant Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6  bg-gray-900/50 backdrop-blur-sm   p-6 ">
                  {/* Usage Statistics */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-medium text-white">Usage Statistics</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Total Usage</span>
                        <span className="text-xs text-white font-mono">{grant.usage}</span>
                      </div>
                      {grant.lastUsed && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Last Used</span>
                          <span className="text-xs text-white">{new Date(grant.lastUsed).toLocaleString()}</span>
                        </div>
                      )}
                      {grant.sessionId && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Session</span>
                          <Link
                            to={`/chat/${grant.sessionId}`}
                            className="text-xs text-blue-400 hover:text-blue-300 underline font-mono"
                          >
                            {grant.sessionId}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grant Timeline */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <h3 className="text-sm font-medium text-white">Timeline</h3>
                    </div>
                    <div className="space-y-2">
                      {grant.grantedAt && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Granted</span>
                          <span className="text-xs text-white">{new Date(grant.grantedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {grant.expiresAt && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Expires</span>
                          <span className={`text-xs ${
                            new Date(grant.expiresAt) < new Date() ? 'text-red-400' : 'text-white'
                          }`}>
                            {new Date(grant.expiresAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {!grant.granted && (
                        <div className="text-xs text-gray-400">
                          Never granted
                        </div>
                      )}
                    </div>
                  </div>

                
                </div>
            
          </div>

          {/* Related Actions */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Related Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/vault"
                className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
              >
                <Eye className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">View Audit Log</p>
                  <p className="text-xs text-gray-400">See all consent decisions and usage</p>
                </div>
              </Link>

              <Link
                to="/grants"
                className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
              >
                <Settings className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-white">Manage All Consents</p>
                  <p className="text-xs text-gray-400">View and manage all permissions</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
