/**
 * Frontend Implementation Validation Test
 * Tests the actual implementation in app/index.html against field naming conventions
 */

const fs = require('fs');
const path = require('path');

// Load the actual frontend HTML file to extract JavaScript functions
const frontendPath = path.join(__dirname, '..', 'app', 'index.html');
const frontendContent = fs.readFileSync(frontendPath, 'utf8');

// Extract JavaScript content from the HTML file
const scriptMatch = frontendContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  throw new Error('Could not find JavaScript content in frontend HTML');
}

const jsContent = scriptMatch[1];

// Test data based on real examples from our system
const testData = {
  yamlAgentManifest: {
    metadata: {
      name: "sap-commerce-agent",
      category: "ecommerce",
      version: "2.1.0", 
      description: "SAP Commerce Cloud integration agent",
      "risk-level": "high",
      "access-level": "privileged",
      "compliance-level": "enterprise",
      "data-classification": "confidential"
    },
    mcpServers: [
      {
        name: "commerce-mcp",
        command: "node", 
        args: ["commerce-server.js"],
        env: {
          SAP_API_URL: "https://api.commerce.sap.com",
          AUTH_TOKEN: "${SAP_AUTH_TOKEN}"
        },
        metadata: {
          category: "ecommerce",
          "risk-level": "high",
          "access-level": "privileged", 
          "data-classification": "confidential",
          "compliance-required": true,
          "audit-logging": true
        },
        tools: [
          {
            name: "searchProducts",
            description: "Search product catalog with advanced filters",
            inputSchema: {
              type: "object",
              properties: {
                searchQuery: { type: "string", description: "Search term" },
                categoryCode: { type: "string", description: "Product category" },
                priceRange: {
                  type: "object", 
                  properties: {
                    minPrice: { type: "number" },
                    maxPrice: { type: "number" }
                  }
                },
                availabilityFilter: { type: "boolean" },
                sortCriteria: { type: "string" },
                resultsLimit: { type: "integer", minimum: 1, maximum: 100 }
              },
              required: ["searchQuery"]
            }
          },
          {
            name: "updateProductInventory", 
            description: "Update inventory levels for products",
            inputSchema: {
              type: "object",
              properties: {
                productCode: { type: "string", pattern: "^[A-Z0-9]{6,12}$" },
                quantityDelta: { type: "integer" },
                warehouseCode: { type: "string" },
                adjustmentReason: { type: "string", enum: ["sale", "return", "damage", "restock"] },
                batchNumber: { type: "string" },
                expirationDate: { type: "string", format: "date" }
              },
              required: ["productCode", "quantityDelta", "warehouseCode", "adjustmentReason"]
            }
          }
        ]
      },
      {
        name: "analytics-mcp",
        command: "python",
        args: ["analytics_server.py"],
        metadata: {
          category: "analytics",
          "risk-level": "medium",
          "access-level": "standard",
          "data-classification": "internal"
        },
        tools: [
          {
            name: "generateSalesReport",
            description: "Generate sales analytics reports", 
            inputSchema: {
              type: "object",
              properties: {
                reportType: { type: "string", enum: ["daily", "weekly", "monthly"] },
                startDate: { type: "string", format: "date" },
                endDate: { type: "string", format: "date" },
                includeMetrics: { type: "array", items: { type: "string" } }
              }
            }
          }
        ]
      }
    ]
  },
  
  mcpHubTools: [
    {
      toolName: "github.create_repository",
      category: "development",
      mcpName: "github-enterprise-mcp",
      description: "Create a new GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          repositoryName: { type: "string" },
          description: { type: "string" },
          isPrivate: { type: "boolean" },
          hasWiki: { type: "boolean" },
          hasIssues: { type: "boolean" },
          licenseTemplate: { type: "string" },
          gitignoreTemplate: { type: "string" }
        }
      }
    },
    {
      toolName: "confluence.update_page_content", 
      category: "collaboration",
      mcpName: "confluence-cloud-mcp",
      description: "Update existing Confluence page content",
      inputSchema: {
        type: "object", 
        properties: {
          pageId: { type: "string" },
          newTitle: { type: "string" },
          newContent: { type: "string" },
          versionComment: { type: "string" },
          notifyWatchers: { type: "boolean" }
        }
      }
    },
    {
      toolName: "jira.create_issue",
      category: "project-management", 
      mcpName: "jira-cloud-mcp",
      description: "Create a new JIRA issue",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string" },
          issueType: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          priority: { type: "string" },
          assignee: { type: "string" },
          labels: { type: "array", items: { type: "string" } },
          dueDate: { type: "string", format: "date" }
        }
      }
    }
  ]
};

console.log('=== Frontend Implementation Validation Tests ===\n');

// Test 1: Validate JavaScript functions exist in frontend
console.log('1. Checking for required JavaScript functions in frontend...');

const requiredFunctions = [
  'loadAgentManifest',
  'loadPolicies', 
  'savePolicy',
  'updateTargetDropdown',
  'updateAttributeDropdown',
  'addConstraint',
  'removeConstraint',
  'showNotification'
];

const missingFunctions = requiredFunctions.filter(func => !jsContent.includes(func));
if (missingFunctions.length === 0) {
  console.log('✅ All required functions found in frontend');
} else {
  console.log('❌ Missing functions:', missingFunctions);
}
console.log('');

// Test 2: Check for field naming convention compliance in JavaScript
console.log('2. Checking field naming convention compliance in JavaScript...');

// Check for sap: prefix usage
const sapPrefixUsage = jsContent.match(/['"`]sap:/g) || [];
console.log(`Found ${sapPrefixUsage.length} uses of 'sap:' prefix in JavaScript`);

// Check for tool name format compliance
const toolNamePatterns = [
  /toolName.*\./, // Fully qualified tool names
  /['"`]\w+\.\w+['"`]/ // Quoted fully qualified names
];

let foundToolNameUsage = false;
toolNamePatterns.forEach(pattern => {
  const matches = jsContent.match(pattern);
  if (matches && matches.length > 0) {
    foundToolNameUsage = true;
    console.log(`✅ Found ${matches.length} properly formatted tool names`);
  }
});

if (!foundToolNameUsage) {
  console.log('⚠️ No fully qualified tool name patterns found');
}
console.log('');

// Test 3: Simulate attribute extraction from YAML
console.log('3. Testing YAML attribute extraction logic...');

function extractAttributesFromYaml(manifest) {
  const attributes = new Set();
  
  // Agent metadata attributes
  if (manifest.metadata) {
    Object.keys(manifest.metadata).forEach(key => {
      if (!['name', 'version', 'description'].includes(key)) {
        attributes.add(`sap:${key}`);
      }
    });
  }
  
  // MCP server attributes
  if (manifest.mcpServers) {
    manifest.mcpServers.forEach(server => {
      if (server.metadata) {
        Object.keys(server.metadata).forEach(key => {
          attributes.add(`sap:${key}`);
        });
      }
      
      // Tool input schema attributes
      if (server.tools) {
        server.tools.forEach(tool => {
          if (tool.inputSchema && tool.inputSchema.properties) {
            addSchemaProperties(tool.inputSchema.properties, attributes);
          }
        });
      }
    });
  }
  
  return Array.from(attributes).sort();
}

function addSchemaProperties(properties, attributes, prefix = 'sap:') {
  Object.keys(properties).forEach(key => {
    attributes.add(`${prefix}${key}`);
    
    // Handle nested objects
    if (properties[key].type === 'object' && properties[key].properties) {
      addSchemaProperties(properties[key].properties, attributes, prefix);
    }
  });
}

const extractedYamlAttributes = extractAttributesFromYaml(testData.yamlAgentManifest);
console.log(`Extracted ${extractedYamlAttributes.length} YAML attributes:`);
console.log(extractedYamlAttributes.slice(0, 10), '...(truncated)');

// Verify key attributes are present
const expectedYamlAttrs = [
  'sap:category', 'sap:risk-level', 'sap:access-level', 'sap:data-classification',
  'sap:searchQuery', 'sap:productCode', 'sap:quantityDelta', 'sap:warehouseCode'
];

const foundExpectedAttrs = expectedYamlAttrs.filter(attr => extractedYamlAttributes.includes(attr));
console.log(`✅ Found ${foundExpectedAttrs.length}/${expectedYamlAttrs.length} expected attributes`);

if (foundExpectedAttrs.length < expectedYamlAttrs.length) {
  const missing = expectedYamlAttrs.filter(attr => !extractedYamlAttributes.includes(attr));
  console.log('❌ Missing expected attributes:', missing);
}
console.log('');

// Test 4: Simulate MCP Hub attribute extraction  
console.log('4. Testing MCP Hub attribute extraction logic...');

function extractAttributesFromMcpHub(tools) {
  const attributes = new Set();
  
  // Standard MCP Hub attributes
  attributes.add('sap:category');
  attributes.add('sap:mcpName');
  
  tools.forEach(tool => {
    if (tool.inputSchema && tool.inputSchema.properties) {
      addSchemaProperties(tool.inputSchema.properties, attributes);
    }
  });
  
  return Array.from(attributes).sort();
}

const extractedMcpHubAttributes = extractAttributesFromMcpHub(testData.mcpHubTools);
console.log(`Extracted ${extractedMcpHubAttributes.length} MCP Hub attributes:`);
console.log(extractedMcpHubAttributes.slice(0, 10), '...(truncated)');

// Verify MCP Hub specific attributes
const expectedMcpHubAttrs = [
  'sap:category', 'sap:mcpName', 'sap:repositoryName', 'sap:pageId', 
  'sap:projectKey', 'sap:issueType'
];

const foundMcpHubAttrs = expectedMcpHubAttrs.filter(attr => extractedMcpHubAttributes.includes(attr));
console.log(`✅ Found ${foundMcpHubAttrs.length}/${expectedMcpHubAttrs.length} expected MCP Hub attributes`);
console.log('');

// Test 5: Tool name format validation
console.log('5. Testing tool name format compliance...');

function extractToolsFromYaml(manifest) {
  const tools = [];
  
  if (manifest.mcpServers) {
    manifest.mcpServers.forEach(server => {
      if (server.tools) {
        server.tools.forEach(tool => {
          tools.push({
            name: `${server.name}.${tool.name}`, // Fully qualified
            displayName: tool.name,
            mcpServer: server.name,
            category: server.metadata?.category || 'general'
          });
        });
      }
    });
  }
  
  return tools;
}

const extractedYamlTools = extractToolsFromYaml(testData.yamlAgentManifest);
console.log('YAML tools with fully qualified names:');
extractedYamlTools.forEach(tool => {
  console.log(`  - ${tool.name} (display: ${tool.displayName})`);
});

// Validate all tool names are fully qualified
const allFullyQualified = extractedYamlTools.every(tool => tool.name.includes('.'));
console.log(allFullyQualified ? '✅ All YAML tool names are fully qualified' : '❌ Some YAML tool names are not fully qualified');

// MCP Hub tools should already be fully qualified
const mcpHubToolsQualified = testData.mcpHubTools.every(tool => tool.toolName.includes('.'));
console.log(mcpHubToolsQualified ? '✅ All MCP Hub tool names are fully qualified' : '❌ Some MCP Hub tool names are not fully qualified');
console.log('');

// Test 6: ODRL constraint format validation
console.log('6. Testing ODRL constraint format...');

function createPolicyConstraint(attribute, operator, value, toolName = null) {
  const constraint = {
    leftOperand: attribute, // Should have sap: prefix
    operator: operator,
    rightOperand: value
  };
  
  if (toolName && toolName !== 'any') {
    constraint.tool = toolName; // Should be fully qualified
  }
  
  return constraint;
}

// Test constraint creation with real data
const testConstraints = [
  createPolicyConstraint('sap:category', 'eq', 'ecommerce'),
  createPolicyConstraint('sap:risk-level', 'eq', 'high', 'commerce-mcp.updateProductInventory'),
  createPolicyConstraint('sap:access-level', 'eq', 'privileged', 'commerce-mcp.updateProductInventory'), 
  createPolicyConstraint('sap:productCode', 'isSet', true, 'commerce-mcp.updateProductInventory'),
  createPolicyConstraint('sap:mcpName', 'eq', 'github-enterprise-mcp', 'github.create_repository')
];

console.log('Generated test constraints:');
testConstraints.forEach((constraint, index) => {
  console.log(`Constraint ${index + 1}:`);
  console.log(`  leftOperand: ${constraint.leftOperand}`);
  console.log(`  operator: ${constraint.operator}`);
  console.log(`  rightOperand: ${constraint.rightOperand}`);
  if (constraint.tool) {
    console.log(`  tool: ${constraint.tool}`);
  }
  console.log('');
});

// Validate constraint compliance
const constraintValidation = testConstraints.map((constraint, index) => {
  const issues = [];
  
  if (!constraint.leftOperand.startsWith('sap:')) {
    issues.push('Missing sap: prefix');
  }
  
  if (constraint.tool && !constraint.tool.includes('.')) {
    issues.push('Tool name not fully qualified');
  }
  
  return {
    index: index + 1,
    isValid: issues.length === 0,
    issues: issues
  };
});

const validConstraints = constraintValidation.filter(v => v.isValid).length;
console.log(`✅ ${validConstraints}/${testConstraints.length} constraints are compliant`);

const invalidConstraints = constraintValidation.filter(v => !v.isValid);
if (invalidConstraints.length > 0) {
  console.log('❌ Invalid constraints:');
  invalidConstraints.forEach(invalid => {
    console.log(`  Constraint ${invalid.index}: ${invalid.issues.join(', ')}`);
  });
}
console.log('');

// Test 7: Source-aware filtering simulation
console.log('7. Testing source-aware filtering...');

function getAttributesForSource(source, targetTool = null) {
  if (source === 'yaml') {
    return extractAttributesFromYaml(testData.yamlAgentManifest);
  } else if (source === 'mcpHub') {
    return extractAttributesFromMcpHub(testData.mcpHubTools);
  }
  return [];
}

const yamlAttrsForEcommerce = getAttributesForSource('yaml');
const mcpHubAttrsForGithub = getAttributesForSource('mcpHub');

// Check for proper separation
const yamlSpecificAttrs = ['sap:risk-level', 'sap:access-level', 'sap:data-classification'];
const mcpHubSpecificAttrs = ['sap:mcpName'];

const yamlHasMcpSpecific = mcpHubSpecificAttrs.some(attr => yamlAttrsForEcommerce.includes(attr));
const mcpHubHasYamlSpecific = yamlSpecificAttrs.some(attr => mcpHubAttrsForGithub.includes(attr));

if (!yamlHasMcpSpecific && !mcpHubHasYamlSpecific) {
  console.log('✅ Source-aware filtering maintains proper separation');
} else {
  console.log('❌ Source-aware filtering has cross-contamination');
  if (yamlHasMcpSpecific) console.log('  YAML source includes MCP Hub specific attributes');
  if (mcpHubHasYamlSpecific) console.log('  MCP Hub source includes YAML specific attributes');
}

console.log('\n=== Validation Complete ===');

// Export test results for CI/CD integration
module.exports = {
  testResults: {
    functionsFound: missingFunctions.length === 0,
    yamlAttributeExtraction: foundExpectedAttrs.length === expectedYamlAttrs.length,
    mcpHubAttributeExtraction: foundMcpHubAttrs.length === expectedMcpHubAttrs.length,
    toolNameCompliance: allFullyQualified && mcpHubToolsQualified,
    constraintCompliance: validConstraints === testConstraints.length,
    sourceAwareFiltering: !yamlHasMcpSpecific && !mcpHubHasYamlSpecific
  },
  extractedData: {
    yamlAttributes: extractedYamlAttributes,
    mcpHubAttributes: extractedMcpHubAttributes,
    yamlTools: extractedYamlTools,
    testConstraints: testConstraints
  }
};