import { DatabaseAuthorizationDetailRequest } from '#cds-models/sap/scai/grants';
import React from 'react';
import type { AuthorizationDetailProps } from './types.tsx';

  
export default function DatabaseAuthorizationDetail({ index, description, riskLevel, category, ...detail }: DatabaseAuthorizationDetailRequest & AuthorizationDetailProps) {
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
            Database Access
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

      {/* Database Access Details */}
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          Database Access Details:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {detail.databases && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Databases</div>
              <div className="space-y-1">
                {detail.databases.map((db, dbIndex) => (
                  <input 
                    key={db} 
                    title='Database'
                    name={`authorization_details[${index}].databases[${dbIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-red-200 font-medium" 
                    value={`${db}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.schemas && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Schemas</div>
              <div className="space-y-1">
                {detail.schemas.map((schema, schemaIndex) => (
                  <input 
                    key={schema} 
                    title='Schema'
                    name={`authorization_details[${index}].schemas[${schemaIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-purple-200 font-medium" 
                    value={`${schema}`} 
                    readOnly 
                  />
                ))}
              </div>
            </div>
          )}
          {detail.tables && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Data Tables</div>
              <div className="space-y-1">
                {detail.tables.map((table, tableIndex) => (
                  <input 
                    key={table} 
                    title='Table'
                    name={`authorization_details[${index}].tables[${tableIndex}]`} 
                    type='text' 
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-blue-200 font-medium" 
                    value={`${table}`} 
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
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Allowed Operations</div>
            <div className="space-y-1">
              {detail.actions.map((action, actionIndex) => (
                <input 
                  key={action} 
                  title='Action'
                  name={`authorization_details[${index}].actions[${actionIndex}]`} 
                  type='text' 
                  className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-green-200 font-medium" 
                  value={`${action}`} 
                  readOnly 
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="text-xs text-red-800 flex items-start space-x-2">
          <span className="text-base">ℹ️</span>
          <span>Database access is limited to the databases, schemas, and tables listed above. No additional configuration is required.</span>
        </div>
      </div>
    </div>
  );
}

