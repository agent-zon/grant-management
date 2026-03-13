const assert = require('assert');
const { describe, it } = require('node:test');

/**
 * Test suite for Field Naming Conventions compliance
 * Based on FIELD_NAMING_CONVENTIONS.md specifications
 */

// Mock data representing real YAML agent manifest
const mockYamlAgentManifest = {
  metadata: {
    name: "commerce-agent",
    category: "ecommerce",
    version: "1.0.0",
    description: "AI Agent for SAP Commerce Cloud operations",
    "risk-level": "medium",
    "access-level": "standard"
  },
  mcpServers: [
    {
      name: "commerce-mcp",
      command: "node",
      args: ["commerce-server.js"],
      env: {
        SAP_API_URL: "https://api.commerce.sap.com"
      },
      metadata: {
        category: "ecommerce",
        "risk-level": "high",
        "access-level": "privileged",
        "data-classification": "confidential"
      },
      tools: [
        {
          name: "searchProducts",
          description: "Search for products in catalog",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              category: { type: "string" },
              priceRange: { type: "object" }
            }
          }
        },
        {
          name: "updateInventory",
          description: "Update product inventory levels",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "number" },
              location: { type: "string" }
            }
          }
        }
      ]
    }
  ]
};

// Mock data representing MCP Hub tools response
const mockMcpHubTools = [
  {
    toolName: "github.search_repositories",
    category: "development",
    mcpName: "github-mcp",
    description: "Search for repositories on GitHub",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        sort: { type: "string" },
        order: { type: "string" }
      }
    }
  },
  {
    toolName: "confluence.create_page",
    category: "collaboration",
    mcpName: "confluence-mcp", 
    description: "Create a new page in Confluence",
    inputSchema: {
      type: "object",
      properties: {
        spaceKey: { type: "string" },
        title: { type: "string" },
        content: { type: "string" }
      }
    }
  }
];

// Test helper functions that simulate our actual logic
function extractAttributesFromYaml(agentManifest) {
  const attributes = [];
  
  // Agent-level attributes (prefixed with sap:)
  if (agentManifest.metadata) {
    Object.keys(agentManifest.metadata).forEach(key => {
      if (!['name', 'version', 'description'].includes(key)) {
        attributes.push(`sap:${key}`);
      }
    });
  }
  
  // MCP server attributes
  if (agentManifest.mcpServers) {
    agentManifest.mcpServers.forEach(server => {
      if (server.metadata) {
        Object.keys(server.metadata).forEach(key => {
          const attrName = `sap:${key}`;
          if (!attributes.includes(attrName)) {
            attributes.push(attrName);
          }
        });
      }
      
      // Tool input schema attributes
      if (server.tools) {
        server.tools.forEach(tool => {
          if (tool.inputSchema && tool.inputSchema.properties) {
            Object.keys(tool.inputSchema.properties).forEach(prop => {
              const attrName = `sap:${prop}`;
              if (!attributes.includes(attrName)) {
                attributes.push(attrName);
              }
            });
          }
        });
      }
    });
  }
  
  return attributes.sort();
}

function extractToolsFromYaml(agentManifest) {
  const tools = [];
  
  if (agentManifest.mcpServers) {
    agentManifest.mcpServers.forEach(server => {
      if (server.tools) {
        server.tools.forEach(tool => {
          // Use fully qualified tool name format
          const fullyQualifiedName = `${server.name}.${tool.name}`;
          tools.push({
            name: fullyQualifiedName,
            displayName: tool.name,
            description: tool.description,
            category: server.metadata?.category || 'general',
            mcpServer: server.name,
            source: 'yaml'
          });
        });
      }
    });
  }
  
  return tools;
}

function extractAttributesFromMcpHub(tools) {
  const attributes = new Set();
  
  tools.forEach(tool => {
    // Add standard attributes with sap: prefix
    attributes.add('sap:category');
    attributes.add('sap:mcpName');
    
    // Add input schema properties
    if (tool.inputSchema && tool.inputSchema.properties) {
      Object.keys(tool.inputSchema.properties).forEach(prop => {
        attributes.add(`sap:${prop}`);
      });
    }
  });
  
  return Array.from(attributes).sort();
}

function createOdrlConstraint(attribute, operator, value, toolName = null) {
  const constraint = {
    leftOperand: attribute,
    operator: operator,
    rightOperand: value
  };
  
  // Add tool reference if provided (must be fully qualified)
  if (toolName) {
    constraint.tool = toolName;
  }
  
  return constraint;
}

// Test Suite
describe('Field Naming Conventions Tests', () => {
  
  describe('YAML Agent Manifest Processing', () => {
    
    it('should extract attributes with sap: prefix from YAML', () => {
      const attributes = extractAttributesFromYaml(mockYamlAgentManifest);
      
      // Should include agent-level attributes
      assert(attributes.includes('sap:category'), 'Should include sap:category from agent metadata');
      assert(attributes.includes('sap:risk-level'), 'Should include sap:risk-level from agent metadata');
      assert(attributes.includes('sap:access-level'), 'Should include sap:access-level from agent metadata');
      
      // Should include MCP server attributes
      assert(attributes.includes('sap:data-classification'), 'Should include sap:data-classification from MCP metadata');
      
      // Should include tool input schema attributes
      assert(attributes.includes('sap:query'), 'Should include sap:query from tool input schema');
      assert(attributes.includes('sap:productId'), 'Should include sap:productId from tool input schema');
      assert(attributes.includes('sap:quantity'), 'Should include sap:quantity from tool input schema');
      
      // Should not include basic metadata fields
      assert(!attributes.includes('sap:name'), 'Should not include basic name field');
      assert(!attributes.includes('sap:version'), 'Should not include basic version field');
      assert(!attributes.includes('sap:description'), 'Should not include basic description field');
    });
    
    it('should create fully qualified tool names from YAML', () => {
      const tools = extractToolsFromYaml(mockYamlAgentManifest);
      
      assert.equal(tools.length, 2, 'Should extract 2 tools');
      assert.equal(tools[0].name, 'commerce-mcp.searchProducts', 'Should use fully qualified name');
      assert.equal(tools[1].name, 'commerce-mcp.updateInventory', 'Should use fully qualified name');
      
      // Verify tool properties
      assert.equal(tools[0].displayName, 'searchProducts', 'Should preserve display name');
      assert.equal(tools[0].mcpServer, 'commerce-mcp', 'Should include MCP server name');
      assert.equal(tools[0].source, 'yaml', 'Should mark source as yaml');
    });
    
  });
  
  describe('MCP Hub Processing', () => {
    
    it('should extract attributes with sap: prefix from MCP Hub tools', () => {
      const attributes = extractAttributesFromMcpHub(mockMcpHubTools);
      
      // Should include standard MCP Hub attributes
      assert(attributes.includes('sap:category'), 'Should include sap:category');
      assert(attributes.includes('sap:mcpName'), 'Should include sap:mcpName');
      
      // Should include tool input schema attributes
      assert(attributes.includes('sap:query'), 'Should include sap:query from input schema');
      assert(attributes.includes('sap:spaceKey'), 'Should include sap:spaceKey from input schema');
      assert(attributes.includes('sap:title'), 'Should include sap:title from input schema');
    });
    
    it('should handle MCP Hub tools with existing fully qualified names', () => {
      // MCP Hub already provides fully qualified tool names
      assert.equal(mockMcpHubTools[0].toolName, 'github.search_repositories');
      assert.equal(mockMcpHubTools[1].toolName, 'confluence.create_page');
    });
    
  });
  
  describe('ODRL Constraint Creation', () => {
    
    it('should create proper ODRL constraints with sap: prefixed attributes', () => {
      const constraint1 = createOdrlConstraint('sap:category', 'eq', 'ecommerce');
      const constraint2 = createOdrlConstraint('sap:risk-level', 'eq', 'high', 'commerce-mcp.updateInventory');
      
      // Verify basic constraint structure
      assert.equal(constraint1.leftOperand, 'sap:category');
      assert.equal(constraint1.operator, 'eq');
      assert.equal(constraint1.rightOperand, 'ecommerce');
      
      // Verify constraint with tool reference
      assert.equal(constraint2.leftOperand, 'sap:risk-level');
      assert.equal(constraint2.tool, 'commerce-mcp.updateInventory');
    });
    
    it('should require fully qualified tool names in constraints', () => {
      const constraint = createOdrlConstraint('sap:access-level', 'eq', 'privileged', 'commerce-mcp.updateInventory');
      
      // Tool name should be fully qualified
      assert(constraint.tool.includes('.'), 'Tool name should be fully qualified with dot notation');
      assert.equal(constraint.tool, 'commerce-mcp.updateInventory');
    });
    
  });
  
  describe('External Policy Evaluation Service Compatibility', () => {
    
    it('should format constraints for external evaluation service', () => {
      // Test case based on real policy evaluation mismatch
      const yamlTools = extractToolsFromYaml(mockYamlAgentManifest);
      const attributes = extractAttributesFromYaml(mockYamlAgentManifest);
      
      // Create policy constraint that external service can evaluate
      const categoryConstraint = createOdrlConstraint('sap:category', 'eq', 'ecommerce');
      const toolConstraint = createOdrlConstraint('sap:access-level', 'eq', 'privileged', yamlTools[1].name);
      
      // Verify external service compatibility
      assert.equal(categoryConstraint.leftOperand, 'sap:category', 'Attribute should have sap: prefix');
      assert.equal(toolConstraint.tool, 'commerce-mcp.updateInventory', 'Tool should be fully qualified');
      
      // Verify no simple tool names
      assert(!toolConstraint.tool.includes('updateInventory') || toolConstraint.tool.includes('.'), 
        'Tool name should not be simple name without MCP prefix');
    });
    
    it('should handle attribute values matching expectations', () => {
      const manifest = mockYamlAgentManifest;
      
      // Test real attribute values from YAML
      const categoryValue = manifest.metadata.category; // "ecommerce"
      const riskLevel = manifest.mcpServers[0].metadata['risk-level']; // "high" 
      const accessLevel = manifest.mcpServers[0].metadata['access-level']; // "privileged"
      
      // Create constraints with real values
      const constraints = [
        createOdrlConstraint('sap:category', 'eq', categoryValue),
        createOdrlConstraint('sap:risk-level', 'eq', riskLevel),
        createOdrlConstraint('sap:access-level', 'eq', accessLevel)
      ];
      
      // Verify constraint values match YAML
      assert.equal(constraints[0].rightOperand, 'ecommerce');
      assert.equal(constraints[1].rightOperand, 'high');
      assert.equal(constraints[2].rightOperand, 'privileged');
    });
    
  });
  
  describe('Source-Aware Attribute Filtering', () => {
    
    it('should provide different attributes for different sources', () => {
      const yamlAttributes = extractAttributesFromYaml(mockYamlAgentManifest);
      const mcpHubAttributes = extractAttributesFromMcpHub(mockMcpHubTools);
      
      // YAML should have YAML-specific attributes
      assert(yamlAttributes.includes('sap:risk-level'), 'YAML should have risk-level');
      assert(yamlAttributes.includes('sap:access-level'), 'YAML should have access-level');
      assert(yamlAttributes.includes('sap:data-classification'), 'YAML should have data-classification');
      
      // MCP Hub should have MCP-specific attributes  
      assert(mcpHubAttributes.includes('sap:mcpName'), 'MCP Hub should have mcpName');
      
      // Both should have common attributes
      assert(yamlAttributes.includes('sap:category'), 'Both should have category');
      assert(mcpHubAttributes.includes('sap:category'), 'Both should have category');
    });
    
  });
  
  describe('Field Naming Convention Rules Compliance', () => {
    
    it('should follow hyphenated attribute naming from YAML', () => {
      const attributes = extractAttributesFromYaml(mockYamlAgentManifest);
      
      // Verify hyphenated attributes are preserved
      assert(attributes.includes('sap:risk-level'), 'Should preserve risk-level hyphenation');
      assert(attributes.includes('sap:access-level'), 'Should preserve access-level hyphenation'); 
      assert(attributes.includes('sap:data-classification'), 'Should preserve data-classification hyphenation');
    });
    
    it('should use camelCase for input schema properties', () => {
      const attributes = extractAttributesFromYaml(mockYamlAgentManifest);
      
      // Tool input properties should use camelCase
      assert(attributes.includes('sap:productId'), 'Should use camelCase for productId');
      assert(attributes.includes('sap:priceRange'), 'Should use camelCase for priceRange');
    });
    
    it('should ensure all attributes have sap: namespace prefix', () => {
      const yamlAttributes = extractAttributesFromYaml(mockYamlAgentManifest);
      const mcpHubAttributes = extractAttributesFromMcpHub(mockMcpHubTools);
      
      // All attributes should start with sap:
      yamlAttributes.forEach(attr => {
        assert(attr.startsWith('sap:'), `Attribute ${attr} should have sap: prefix`);
      });
      
      mcpHubAttributes.forEach(attr => {
        assert(attr.startsWith('sap:'), `Attribute ${attr} should have sap: prefix`);
      });
    });
    
  });
  
});

// Export test data for manual verification
module.exports = {
  mockYamlAgentManifest,
  mockMcpHubTools,
  extractAttributesFromYaml,
  extractToolsFromYaml,
  extractAttributesFromMcpHub,
  createOdrlConstraint
};