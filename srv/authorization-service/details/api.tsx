import React from 'react';
import type { AuthorizationDetailProps } from './types.tsx';
import type { ApiAuthorizationDetailRequest } from '#cds-models/sap/scai/grants';


export default function APIAuthorizationDetail({ index, description, riskLevel, category, ...detail }: ApiAuthorizationDetailRequest & AuthorizationDetailProps) {
  return (
    <div
      className={`bg-white rounded-xl p-6 border-2 ${
        riskLevel === 'high' ? 'border-red-300 bg-red-50/30' :
        riskLevel === 'medium' ? 'border-amber-300 bg-amber-50/30' :
        'border-green-300 bg-green-50/30'
      } shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            riskLevel === 'high' ? 'bg-red-100 text-red-700' :
            riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            API Access
          </div>
          {category && (
            <span className="text-sm text-gray-600 font-medium">
              {category}
            </span>
          )}
        </div>
        <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
          riskLevel === 'high' ? 'bg-red-100 text-red-700' :
          riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
        </div>
      </div>

      <p className="text-base text-gray-700 mb-5 leading-relaxed">
        {description}
      </p>

      {/* Access Details */}
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          Access Details:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {detail.urls && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Service Endpoints</div>
              <div className="space-y-1">
                {detail.urls.map((url, urlIndex) => (
                  <input 
                    key={url} 
                    title='Service Endpoint'
                    name={`authorization_details[${index}].urls[${urlIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-blue-200 font-mono" 
                    value={`${url}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.protocols && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Communication Method</div>
              <div className="space-y-1">
                {detail.protocols.map((protocol, protocolIndex) => (
                  <input 
                    key={protocol} 
                    title='Protocol'
                    name={`authorization_details[${index}].protocols[${protocolIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-green-200 font-medium" 
                    value={`${protocol}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.actions && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Allowed Operations</div>
              <div className="space-y-1">
                {detail.actions.map((action, actionIndex) => (
                  <input 
                    key={action} 
                    title='Action'
                    name={`authorization_details[${index}].actions[${actionIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-purple-200 font-medium" 
                    value={`${action}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs text-blue-800 flex items-start space-x-2">
          <span className="text-base">ℹ️</span>
          <span>Access is limited to the services and operations listed above. No additional configuration is required.</span>
        </div>
      </div>
    </div>
  );
}

