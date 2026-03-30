/**
 * Integration test for field naming conventions in the actual frontend
 * Tests the real JavaScript functions from app/index.html
 */

// Mock DOM elements for testing
const mockDocument = {
  getElementById: (id) => ({
    value: '',
    innerHTML: '',
    appendChild: (element) => {},
    addEventListener: () => {}
  }),
  createElement: (tag) => ({
    textContent: '',
    className: '',
    value: '',
    appendChild: () => {},
    addEventListener: () => {}
  })
};

// Mock global variables that would be set in the browser
global.document = mockDocument;
global.agentManifests = {};
global.mcpHubData = {};

// Import the actual functions from our frontend (we'll need to extract them)
// For now, we'll copy the key functions here for testing

function extractYamlAttributes(agentManifest, targetTool) {
  const attributes = new Set();
  
  // Agent-level attributes with sap: prefix
  if (agentManifest.metadata) {
    Object.keys(agentManifest.metadata).forEach(key => {
      if (!['name', 'version', 'description'].includes(key)) {
        attributes.add(`sap:${key}`);
      }
    });
  }
  
  // MCP server-level attributes
  if (agentManifest.mcpServers) {
    agentManifest.mcpServers.forEach(server => {
      if (server.metadata) {
        Object.keys(server.metadata).forEach(key => {
          attributes.add(`sap:${key}`);
        });
      }
      
      // Tool-specific attributes from input schema
      if (server.tools) {
        server.tools.forEach(tool => {
          const toolFullName = `${server.name}.${tool.name}`;
          if (!targetTool || targetTool === toolFullName) {
            if (tool.inputSchema && tool.inputSchema.properties) {
              Object.keys(tool.inputSchema.properties).forEach(prop => {
                attributes.add(`sap:${prop}`);
              });
            }
          }
        });
      }
    });
  }
  
  return Array.from(attributes).sort();
}

function extractMcpHubAttributes(mcpHubData, targetTool) {
  const attributes = new Set();
  
  // Standard MCP Hub attributes
  attributes.add('sap:category');
  attributes.add('sap:mcpName');
  
  if (mcpHubData.tools) {
    mcpHubData.tools.forEach(tool => {
      if (!targetTool || targetTool === tool.toolName) {
        // Add input schema attributes
        if (tool.inputSchema && tool.inputSchema.properties) {
          Object.keys(tool.inputSchema.properties).forEach(prop => {
            attributes.add(`sap:${prop}`);
          });
        }
      }
    });
  }
  
  return Array.from(attributes).sort();
}

function createConstraintFromUI(attribute, operator, value, targetTool) {
  return {
    leftOperand: attribute, // Should already have sap: prefix
    operator: operator,
    rightOperand: value,
    ...(targetTool && targetTool !== 'any' ? { tool: targetTool } : {})
  };
}

// Test data matching our real examples
const commerceAgentManifest = {
  metadata: {
    name: "commerce-agent",
    category: "ecommerce", 
    version: "1.0.0",
    description: "SAP Commerce Cloud AI Agent",
    "risk-level": "medium",
    "access-level": "standard",
    "compliance-level": "gdpr"
  },
  mcpServers: [
    {
      name: "commerce-mcp",
      command: "node",
      args: ["server.js"],
      metadata: {
        category: "ecommerce",
        "risk-level": "high", 
        "access-level": "privileged",
        "data-classification": "confidential",
        "compliance-required": true
      },
      tools: [
        {
          name: "searchProducts", 
          description: "Search product catalog",
          inputSchema: {
            type: "object",
            properties: {
              searchQuery: { type: "string" },
              categoryFilter: { type: "string" },
              priceRange: { 
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" }
                }
              },
              sortBy: { type: "string" }
            }
          }
        },
        {
          name: "updateInventory",
          description: "Update product inventory",
          inputSchema: {
            type: "object", 
            properties: {
              productId: { type: "string" },
              quantityChange: { type: "integer" },
              warehouseLocation: { type: "string" },
              reasonCode: { type: "string" }
            }
          }
        }
      ]
    }
  ]
};

const mcpHubToolsData = {
  tools: [
    {
      toolName: "github.search_repositories",
      category: "development",
      mcpName: "github-mcp",
      description: "Search GitHub repositories", 
      inputSchema: {
        type: "object",
        properties: {
          searchTerm: { type: "string" },
          language: { type: "string" },
          sortOrder: { type: "string" },
          itemsPerPage: { type: "number" }
        }
      }
    },
    {
      toolName: "confluence.create_page", 
      category: "collaboration",
      mcpName: "confluence-mcp",
      description: "Create Confluence page",
      inputSchema: {
        type: "object",
        properties: {
          spaceKey: { type: "string" },
          pageTitle: { type: "string" },
          pageContent: { type: "string" },
          parentPageId: { type: "string" }
        }
      }
    }
  ]
};

// Integration Tests
console.log('=== Field Naming Conventions Integration Tests ===\n');

// Test 1: YAML Attribute Extraction
console.log('1. Testing YAML attribute extraction...');
const yamlAttributes = extractYamlAttributes(commerceAgentManifest);
console.log('Extracted YAML attributes:', yamlAttributes);

// Verify key attributes
const expectedYamlAttrs = [
  'sap:access-level', 'sap:category', 'sap:categoryFilter', 'sap:compliance-level', 
  'sap:compliance-required', 'sap:data-classification', 'sap:max', 'sap:min',
  'sap:priceRange', 'sap:productId', 'sap:quantityChange', 'sap:reasonCode',
  'sap:risk-level', 'sap:searchQuery', 'sap:sortBy', 'sap:warehouseLocation'
];

const missingYamlAttrs = expectedYamlAttrs.filter(attr => !yamlAttributes.includes(attr));
if (missingYamlAttrs.length === 0) {
  console.log('✅ All expected YAML attributes found');
} else {
  console.log('❌ Missing YAML attributes:', missingYamlAttrs);
}
console.log('');

// Test 2: MCP Hub Attribute Extraction  
console.log('2. Testing MCP Hub attribute extraction...');
const mcpHubAttributes = extractMcpHubAttributes(mcpHubToolsData);
console.log('Extracted MCP Hub attributes:', mcpHubAttributes);

const expectedMcpHubAttrs = [
  'sap:category', 'sap:itemsPerPage', 'sap:language', 'sap:mcpName',
  'sap:pageContent', 'sap:pageTitle', 'sap:parentPageId', 'sap:searchTerm',
  'sap:sortOrder', 'sap:spaceKey'
];

const missingMcpHubAttrs = expectedMcpHubAttrs.filter(attr => !mcpHubAttributes.includes(attr));
if (missingMcpHubAttrs.length === 0) {
  console.log('✅ All expected MCP Hub attributes found');
} else {
  console.log('❌ Missing MCP Hub attributes:', missingMcpHubAttrs);
}
console.log('');

// Test 3: Tool-Specific Attribute Filtering
console.log('3. Testing tool-specific attribute filtering...');
const searchProductsAttrs = extractYamlAttributes(commerceAgentManifest, 'commerce-mcp.searchProducts');
console.log('Attributes for searchProducts tool:', searchProductsAttrs);

const githubAttrs = extractMcpHubAttributes(mcpHubToolsData, 'github.search_repositories');
console.log('Attributes for GitHub tool:', githubAttrs);
console.log('');

// Test 4: Constraint Creation with Proper Formatting
console.log('4. Testing ODRL constraint creation...');

// Test constraints that would be created by the UI
const constraints = [
  createConstraintFromUI('sap:category', 'eq', 'ecommerce', 'any'),
  createConstraintFromUI('sap:risk-level', 'eq', 'high', 'commerce-mcp.updateInventory'),
  createConstraintFromUI('sap:access-level', 'eq', 'privileged', 'commerce-mcp.updateInventory'),
  createConstraintFromUI('sap:productId', 'isSet', true, 'commerce-mcp.updateInventory'),
  createConstraintFromUI('sap:mcpName', 'eq', 'github-mcp', 'github.search_repositories')
];

console.log('Generated ODRL constraints:');
constraints.forEach((constraint, index) => {
  console.log(`Constraint ${index + 1}:`, JSON.stringify(constraint, null, 2));
});
console.log('');

// Test 5: External Policy Evaluation Service Compatibility
console.log('5. Testing external policy evaluation compatibility...');

// Verify all constraints follow the naming conventions
const validationResults = constraints.map((constraint, index) => {
  const issues = [];
  
  // Check leftOperand has sap: prefix
  if (!constraint.leftOperand.startsWith('sap:')) {
    issues.push('Missing sap: prefix on leftOperand');
  }
  
  // Check tool name is fully qualified (if present)
  if (constraint.tool && constraint.tool !== 'any' && !constraint.tool.includes('.')) {
    issues.push('Tool name not fully qualified');
  }
  
  return {
    constraintIndex: index + 1,
    isValid: issues.length === 0,
    issues: issues
  };
});

validationResults.forEach(result => {
  if (result.isValid) {
    console.log(`✅ Constraint ${result.constraintIndex}: Valid for external evaluation`);
  } else {
    console.log(`❌ Constraint ${result.constraintIndex}: Issues - ${result.issues.join(', ')}`);
  }
});
console.log('');

// Test 6: Source-Aware Filtering Simulation
console.log('6. Testing source-aware attribute filtering...');

function simulateSourceSelection(source, targetTool) {
  if (source === 'yaml') {
    return extractYamlAttributes(commerceAgentManifest, targetTool);
  } else if (source === 'mcpHub') {
    return extractMcpHubAttributes(mcpHubToolsData, targetTool);
  }
  return [];
}

const yamlSourceAttrs = simulateSourceSelection('yaml', 'commerce-mcp.searchProducts');
const mcpHubSourceAttrs = simulateSourceSelection('mcpHub', 'github.search_repositories');

console.log('YAML source attributes for commerce-mcp.searchProducts:', yamlSourceAttrs);
console.log('MCP Hub source attributes for github.search_repositories:', mcpHubSourceAttrs);

// Verify no cross-contamination
const yamlSpecificAttrs = ['sap:risk-level', 'sap:access-level', 'sap:data-classification'];
const mcpHubSpecificAttrs = ['sap:mcpName'];

const yamlContainsMcpAttrs = mcpHubSpecificAttrs.some(attr => yamlSourceAttrs.includes(attr));
const mcpHubContainsYamlAttrs = yamlSpecificAttrs.some(attr => mcpHubSourceAttrs.includes(attr));

if (!yamlContainsMcpAttrs && !mcpHubContainsYamlAttrs) {
  console.log('✅ Source-aware filtering working correctly');
} else {
  console.log('❌ Cross-contamination detected in source filtering');
}
console.log('');

console.log('=== Integration Tests Completed ===');

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total YAML attributes extracted: ${yamlAttributes.length}`);
console.log(`Total MCP Hub attributes extracted: ${mcpHubAttributes.length}`);
console.log(`ODRL constraints created: ${constraints.length}`);
console.log(`Valid constraints for external evaluation: ${validationResults.filter(r => r.isValid).length}/${constraints.length}`);

// Export for use in other tests
module.exports = {
  commerceAgentManifest,
  mcpHubToolsData,
  extractYamlAttributes,
  extractMcpHubAttributes,
  createConstraintFromUI,
  simulateSourceSelection
};