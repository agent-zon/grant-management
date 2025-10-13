import React from 'react';
import type { AuthorizationDetailProps } from './types.d.ts';
import type { ApiAuthorizationDetailRequest } from '#cds-models/com/sap/agent/grants';


export default function APIAuthorizationDetail({ index, description, riskLevel, category, ...detail }: ApiAuthorizationDetailRequest & AuthorizationDetailProps) {
  return (
    <div
      className={`bg-gray-700/30 rounded-lg p-6 border-l-4 ${
        riskLevel === 'high' ? 'border-red-500' :
        riskLevel === 'medium' ? 'border-yellow-500' :
        'border-green-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            riskLevel === 'high' ? 'bg-red-500/20 text-red-300' :
            riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-green-500/20 text-green-300'
          }`}>
            {detail.type_code}
          </div>
          <span className="text-sm text-gray-400">
            {category}
          </span>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          riskLevel === 'high' ? 'bg-red-500/20 text-red-300' :
          riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-green-500/20 text-green-300'
        }`}>
          {riskLevel.toUpperCase()} RISK
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        {description}
      </p>


      {/* API Configuration */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-400 mb-2">
          API Configuration (fixed scope):
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {detail.urls && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">API URLs</div>
              <div className="text-sm text-white">
                {detail.urls.map((url, urlIndex) => (
                  <input 
                    key={url} 
                    title='API URL'
                    name={`authorization_details[${index}].urls[${urlIndex}]`} 
                    type='text' 
                    className="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`🔗 ${url}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.protocols && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Protocols</div>
              <div className="text-sm text-white">
                {detail.protocols.map((protocol, protocolIndex) => (
                  <input 
                    key={protocol} 
                    title='Protocol'
                    name={`authorization_details[${index}].protocols[${protocolIndex}]`} 
                    type='text' 
                    className="inline-block bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`📡 ${protocol}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.actions && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Actions</div>
              <div className="text-sm text-white">
                {detail.actions.map((action, actionIndex) => (
                  <input 
                    key={action} 
                    title='Action'
                    name={`authorization_details[${index}].actions[${actionIndex}]`} 
                    type='text' 
                    className="inline-block bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`⚡ ${action}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
        <div className="text-xs text-blue-300">
          ℹ️ API access scope is defined by the URLs and protocols above. No additional user configuration required.
        </div>
      </div>
    </div>
  );
}

