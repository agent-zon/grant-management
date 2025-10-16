import { DatabaseAuthorizationDetailRequest } from '#cds-models/com/sap/agent/grants';
import React from 'react';
import type { AuthorizationDetailProps } from './types.tsx';

  
export default function DatabaseAuthorizationDetail({ index, description, riskLevel, category, ...detail }: DatabaseAuthorizationDetailRequest & AuthorizationDetailProps) {
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
          {riskLevel?.toUpperCase()} RISK
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        {description}
      </p>


      {/* Database Configuration */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-400 mb-2">
          Database Configuration (fixed scope):
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {detail.databases && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Databases</div>
              <div className="text-sm text-white">
                {detail.databases.map((db, dbIndex) => (
                  <input 
                    key={db} 
                    title='Database'
                    name={`authorization_details[${index}].databases[${dbIndex}]`} 
                    type='text' 
                    className="inline-block bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`🗄️ ${db}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.schemas && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Schemas</div>
              <div className="text-sm text-white">
                {detail.schemas.map((schema, schemaIndex) => (
                  <input 
                    key={schema} 
                    title='Schema'
                    name={`authorization_details[${index}].schemas[${schemaIndex}]`} 
                    type='text' 
                    className="inline-block bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`📋 ${schema}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.tables && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Tables</div>
              <div className="text-sm text-white">
                {detail.tables.map((table, tableIndex) => (
                  <input 
                    key={table} 
                    title='Table'
                    name={`authorization_details[${index}].tables[${tableIndex}]`} 
                    type='text' 
                    className="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs mr-1 mb-1" 
                    value={`📊 ${table}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {detail.actions && (
        <div className="mb-4">
          <div className="bg-gray-600/50 rounded p-2">
            <div className="text-xs text-gray-400 uppercase">Allowed Actions</div>
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
        </div>
      )}

      <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
        <div className="text-xs text-red-300">
          ⚠️ Database access scope is fixed and defined by the configuration above. No additional user permissions required.
        </div>
      </div>
    </div>
  );
}

