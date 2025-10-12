
// UNUSED - Mustache Templates for Authorization Details
// This file contains Mustache templates for future reference
// Currently using React JSX rendering instead of Mustache templates
// TODO: Implement database-stored templates from AuthorizationDetailType.template

const templates = {
  'grant_management': {
    type: 'grant_management',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>Grant Management Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>Scope & Locations</h4>
          {{#locations}}<span class="property-tag">{{.}}</span>{{/locations}}
          {{#actions}}<span class="action-tag">{{.}}</span>{{/actions}}
        </div>
        
        <div class="tools-section">
          <h4>Tools & Permissions</h4>
          {{#tools}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="tool_{{@key}}" 
                   id="tool_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="tool_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/tools}}
        </div>
      </div>
    `,
    description: 'Access to grant management system for creating, reading, updating, and deleting grants',
    riskLevel: 'medium',
    category: 'system-admin',
    availableTools: ['create_grant', 'read_grant', 'update_grant', 'delete_grant', 'list_grants', 'grant_analytics']
  },

  'file_access': {
    type: 'file_access',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>File System Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>Access Scope</h4>
          {{#locations}}<span class="location-tag">📁 {{.}}</span>{{/locations}}
          {{#datatypes}}<span class="datatype-tag">📄 {{.}}</span>{{/datatypes}}
          {{#identifier}}<span class="identifier-tag">🎯 {{.}}</span>{{/identifier}}
        </div>
        
        <div class="tools-section">
          <h4>File Operations</h4>
          {{#tools}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="tool_{{@key}}" 
                   id="tool_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="tool_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/tools}}
        </div>
      </div>
    `,
    description: 'Access to file system resources including read, write, and management operations',
    riskLevel: 'high',
    category: 'file-system',
    availableTools: ['read_file', 'write_file', 'delete_file', 'list_directory', 'create_directory', 'file_metadata', 'file_search']
  },

  'data_access': {
    type: 'data_access',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>Data Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>Data Scope</h4>
          {{#datatypes}}<span class="datatype-tag">📊 {{.}}</span>{{/datatypes}}
          {{#locations}}<span class="location-tag">🌐 {{.}}</span>{{/locations}}
        </div>
        
        <div class="tools-section">
          <h4>Data Operations</h4>
          {{#tools}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="tool_{{@key}}" 
                   id="tool_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="tool_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/tools}}
        </div>
      </div>
    `,
    description: 'Access to data resources and analytics capabilities',
    riskLevel: 'medium',
    category: 'data-access',
    availableTools: ['query_data', 'aggregate_data', 'export_data', 'data_analytics', 'create_report', 'data_visualization']
  },

  'network_access': {
    type: 'network_access',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>Network Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>Network Endpoints</h4>
          {{#locations}}<span class="location-tag">🌐 {{.}}</span>{{/locations}}
          {{#actions}}<span class="action-tag">⚡ {{.}}</span>{{/actions}}
        </div>
        
        <div class="tools-section">
          <h4>Network Operations</h4>
          {{#tools}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="tool_{{@key}}" 
                   id="tool_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="tool_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/tools}}
        </div>
      </div>
    `,
    description: 'Network connectivity and external service integration',
    riskLevel: 'high',
    category: 'network',
    availableTools: ['http_request', 'webhook_send', 'api_call', 'websocket_connect', 'ftp_access', 'ssh_connect']
  },

  'mcp': {
    type: 'mcp',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>MCP Tools Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>MCP Server Configuration</h4>
          {{#server}}<span class="location-tag">🖥️ {{.}}</span>{{/server}}
          {{#transport}}<span class="action-tag">🔗 {{.}}</span>{{/transport}}
          {{#locations}}<span class="location-tag">🌐 {{.}}</span>{{/locations}}
          {{#actions}}<span class="action-tag">⚡ {{.}}</span>{{/actions}}
        </div>
        
        <div class="tools-section">
          <h4>MCP Tools</h4>
          {{#tools}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="tool_{{@key}}" 
                   id="tool_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="tool_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/tools}}
        </div>
      </div>
    `,
    description: 'Access to Model Context Protocol (MCP) tools and services',
    riskLevel: 'medium',
    category: 'mcp-integration',
    availableTools: ['system.monitor', 'user.manage', 'config.read', 'logs.analyze', 'metrics.read', 'dashboard.view', 'chart.generate', 'cloud.create', 'cloud.delete', 'system.admin', 'data.export', 'backup.create']
  },

  'api': {
    type: 'api',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>API Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>API Configuration</h4>
          {{#urls}}<span class="location-tag">🔗 {{.}}</span>{{/urls}}
          {{#protocols}}<span class="action-tag">📡 {{.}}</span>{{/protocols}}
          {{#actions}}<span class="action-tag">⚡ {{.}}</span>{{/actions}}
        </div>
      </div>
    `,
    description: 'Access to REST API endpoints and web services',
    riskLevel: 'medium',
    category: 'api-access',
    availableTools: []
  },

  'database': {
    type: 'database',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>Database Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>Database Configuration</h4>
          {{#databases}}<span class="location-tag">🗄️ {{.}}</span>{{/databases}}
          {{#schemas}}<span class="location-tag">📋 {{.}}</span>{{/schemas}}
          {{#tables}}<span class="location-tag">📊 {{.}}</span>{{/tables}}
          {{#actions}}<span class="action-tag">⚡ {{.}}</span>{{/actions}}
        </div>
      </div>
    `,
    description: 'Direct database access and operations',
    riskLevel: 'high',
    category: 'database-access',
    availableTools: []
  },

  'fs': {
    type: 'fs',
    template: `
      <div class="authorization-detail" data-type="{{type}}">
        <div class="detail-header">
          <h3>File System Access</h3>
          <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}} RISK</span>
        </div>
        <p class="description">{{description}}</p>
        
        <div class="fixed-properties">
          <h4>File System Configuration</h4>
          {{#roots}}<span class="location-tag">📁 {{.}}</span>{{/roots}}
          {{#actions}}<span class="action-tag">⚡ {{.}}</span>{{/actions}}
        </div>
        
        <div class="tools-section">
          <h4>File Permissions</h4>
          {{#permissions}}
          <div class="tool-item">
            <input type="checkbox" 
                   name="perm_{{@key}}" 
                   id="perm_{{@key}}_{{@index}}"
                   {{#essential}}checked disabled{{/essential}}
                   {{^essential}}{{#granted}}checked{{/granted}}{{/essential}} />
            <label for="perm_{{@key}}_{{@index}}">
              {{@key}}
              {{#essential}}<span class="essential-badge">REQUIRED</span>{{/essential}}
            </label>
          </div>
          {{/permissions}}
        </div>
      </div>
    `,
    description: 'File system access with configurable permissions',
    riskLevel: 'high',
    category: 'file-system',
    availableTools: []
  }
};
// Authorization Detail Templates Registry
export class AuthorizationDetailTemplates {


  static getTemplate<T extends keyof typeof templates>(type: T): typeof templates[T] | null {
    return templates[type] || null;
  }

  static getSupportedTypes(){
    return Object.keys(templates);
  }
}


