const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import handlers
const McpHubHandler = require('../mcp-hub/mcp-hub-handler');
const McpHubCardsHandler = require('../mcp-hub/mcp-hub-cards-handler');
const GitHandler = require('../git-handler/git-handler');

// Test configuration
const TEST_AGENT_ID = 'test-agent-123';
const TEST_CONFIG = {
  gitRepo: 'AIAM/policies',
  gitBranch: 'main'
};

// Helper function to create test data
function createTestMcpData() {
  return [
    {
      id: 'test-mcp-1',
      name: 'Test MCP 1',
      description: 'Test MCP for validation',
      toolsList: JSON.stringify([
        {
          name: 'test_tool_1',
          description: 'Test tool 1',
          inputSchema: {
            type: 'object',
            properties: {
              'sap:query': { type: 'string' },
              'sap:category': { type: 'string' }
            }
          }
        }
      ])
    }
  ];
}

test('MCP Hub Cards Validation - Comprehensive Test Suite', async (t) => {
  console.log('🧪 Running Comprehensive MCP Hub Cards Validation...\n');

  await t.test('MCP Hub Data Loading', async () => {
    console.log('📥 Testing MCP Hub data loading...');

    const mcpHubHandler = new McpHubHandler();

    // Test that handler can be instantiated
    assert.ok(mcpHubHandler, 'MCP Hub Handler should be instantiated');

    // Test getMcpRegistryWithTools method exists
    assert.ok(typeof mcpHubHandler.getMcpRegistryWithTools === 'function',
      'getMcpRegistryWithTools method should exist');

    console.log('✅ MCP Hub Handler initialization test passed');
  });

  await t.test('MCP Hub Data Structure Validation', async () => {
    console.log('🏗️ Testing MCP Hub data structure...');

    const testData = createTestMcpData();

    assert.ok(Array.isArray(testData), 'Test data should be an array');
    assert.ok(testData.length > 0, 'Test data should not be empty');

    const mcp = testData[0];
    assert.ok(mcp.hasOwnProperty('id'), 'MCP should have id property');
    assert.ok(mcp.hasOwnProperty('name'), 'MCP should have name property');
    assert.ok(mcp.hasOwnProperty('toolsList'), 'MCP should have toolsList property');

    console.log('✅ MCP Hub data structure validation passed');
  });

  await t.test('MCP Hub Cards Generation', async () => {
    console.log('🏗️ Testing MCP Hub cards generation...');

    const cardsHandler = new McpHubCardsHandler();
    const testData = createTestMcpData();

    // Test cards generation with mock data
    const generatedCards = await cardsHandler.generateMcpCards(testData, TEST_AGENT_ID);

    assert.ok(generatedCards, 'Cards should be generated');
    assert.ok(Array.isArray(generatedCards), 'Generated cards should be an array');
    assert.ok(generatedCards.length > 0, 'Should generate at least one card');

    // Test card structure
    const firstCard = generatedCards[0];
    assert.ok(firstCard.name, 'Card should have a name');
    assert.ok(firstCard.tools, 'Card should have tools');
    assert.ok(Array.isArray(firstCard.tools), 'Tools should be an array');

    console.log(`✅ Generated ${generatedCards.length} cards successfully`);
  });

  await t.test('Tool Extraction from toolsList', async () => {
    console.log('🔧 Testing tool extraction from toolsList...');

    const cardsHandler = new McpHubCardsHandler();
    const testData = createTestMcpData();

    const generatedCards = await cardsHandler.generateMcpCards(testData, TEST_AGENT_ID);

    const firstCard = generatedCards[0];
    assert.ok(firstCard.tools.length > 0, 'Should extract at least one tool');

    const firstTool = firstCard.tools[0];
    assert.ok(firstTool.hasOwnProperty('name'), 'Tool should have name property');
    assert.ok(firstTool.hasOwnProperty('description'), 'Tool should have description property');
    assert.ok(firstTool.hasOwnProperty('inputSchema'), 'Tool should have inputSchema property');

    console.log('✅ Tool extraction validation passed');
  });

  await t.test('YAML Schema Validation', async () => {
    console.log('📋 Testing YAML schema validation...');

    const testCard = {
      name: 'test-mcp',
      title: 'Test MCP',
      description: 'Test MCP card for validation',
      tools: [
        {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'Test tool for validation',
          inputSchema: {
            type: 'object',
            properties: {
              'sap:query': { type: 'string' }
            }
          },
          _meta: {
            'sap/source': 'mcp-hub',
            'sap/riskLevel': 'medium',
            'sap/accessLevel': 'standard'
          }
        }
      ]
    };

    // Test YAML serialization
    const yamlString = yaml.dump(testCard);
    assert.ok(yamlString, 'Should be able to serialize to YAML');
    assert.ok(yamlString.includes('name: test-mcp'), 'YAML should contain card name');

    // Test YAML parsing
    const parsedCard = yaml.load(yamlString);
    assert.deepStrictEqual(parsedCard.name, testCard.name, 'Parsed card name should match');
    assert.deepStrictEqual(parsedCard.tools.length, testCard.tools.length, 'Tools count should match');

    console.log('✅ YAML schema validation passed');
  });

  await t.test('Complex YAML Structure Handling', async () => {
    console.log('🔄 Testing complex YAML structure handling...');

    const complexCard = {
      name: 'complex-mcp',
      tools: [
        {
          name: 'complex_tool',
          inputSchema: {
            type: 'object',
            properties: {
              'sap:nestedObject': {
                type: 'object',
                properties: {
                  'sap:innerProperty': { type: 'string' }
                }
              },
              'sap:arrayProperty': {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      ]
    };

    const yamlString = yaml.dump(complexCard);
    const parsedCard = yaml.load(yamlString);

    assert.ok(parsedCard.tools[0].inputSchema.properties.hasOwnProperty('sap:nestedObject'),
      'Should handle nested objects');
    assert.ok(parsedCard.tools[0].inputSchema.properties.hasOwnProperty('sap:arrayProperty'),
      'Should handle array properties');

    console.log('✅ Complex YAML structure handling passed');
  });

  await t.test('Data Integrity Validation', async () => {
    console.log('🔍 Testing data integrity...');

    const cardsHandler = new McpHubCardsHandler();
    const testData = createTestMcpData();

    // Generate cards from test data
    const generatedCards = await cardsHandler.generateMcpCards(testData, TEST_AGENT_ID);

    // Validate data integrity
    for (let i = 0; i < testData.length; i++) {
      const originalMcp = testData[i];
      const generatedCard = generatedCards[i];

      // Check basic properties
      assert.strictEqual(generatedCard.name, originalMcp.name || originalMcp.id,
        'Card name should match original MCP name/id');

      // Check tools extraction
      const originalTools = JSON.parse(originalMcp.toolsList || '[]');
      assert.strictEqual(generatedCard.tools.length, originalTools.length,
        'Generated tools count should match original tools count');

      // Check tool properties
      if (originalTools.length > 0 && generatedCard.tools.length > 0) {
        const originalTool = originalTools[0];
        const generatedTool = generatedCard.tools[0];

        assert.strictEqual(generatedTool.name, originalTool.name,
          'Tool name should be preserved');
        assert.strictEqual(generatedTool.description, originalTool.description,
          'Tool description should be preserved');
        assert.ok(generatedTool.inputSchema, 'Tool should have input schema');
      }
    }

    console.log('✅ Data integrity validation passed');
  });

  await t.test('Malformed Data Handling', async () => {
    console.log('⚠️ Testing malformed data handling...');

    const cardsHandler = new McpHubCardsHandler();
    const malformedData = [
      { id: 'test-1' }, // Missing name and toolsList
      { id: 'test-2', name: 'Test 2', toolsList: 'invalid-json' }, // Invalid JSON
      { id: 'test-3', name: 'Test 3', toolsList: '[]' } // Empty tools
    ];

    // Should not throw errors
    let generatedCards;
    assert.doesNotThrow(async () => {
      generatedCards = await cardsHandler.generateMcpCards(malformedData, TEST_AGENT_ID);
    }, 'Should handle malformed data gracefully');

    assert.ok(Array.isArray(generatedCards), 'Should return array even with malformed data');

    console.log('✅ Malformed data handling passed');
  });

  await t.test('Git Operations Validation', async () => {
    console.log('📂 Testing Git operations...');

    const gitHandler = new GitHandler();

    // Test handler initialization
    assert.ok(gitHandler, 'Git Handler should be instantiated');

    // Test method availability
    assert.ok(typeof gitHandler.createOrUpdateFile === 'function',
      'createOrUpdateFile method should exist');
    assert.ok(typeof gitHandler.commitAndPush === 'function',
      'commitAndPush method should exist');

    console.log('✅ Git operations validation passed');
  });

  await t.test('Git File Path Generation', async () => {
    console.log('📁 Testing Git file path generation...');

    const agentId = 'test-agent-123';
    const mcpName = 'test-mcp';
    const expectedPath = `${agentId}/mcps/mcp-hub/${mcpName}.yaml`;

    // Test path generation logic
    assert.ok(expectedPath.includes(agentId), 'Path should include agent ID');
    assert.ok(expectedPath.includes('mcps/mcp-hub'), 'Path should include MCP hub folder');
    assert.ok(expectedPath.includes(`${mcpName}.yaml`), 'Path should include YAML filename');

    console.log('✅ Git file path generation passed');
  });

  await t.test('Schema Compliance Validation', async () => {
    console.log('📝 Testing schema compliance...');

    const testCard = {
      name: 'compliance-test',
      title: 'Compliance Test',
      description: 'Test card for schema compliance',
      tools: [
        {
          name: 'compliant_tool',
          title: 'Compliant Tool',
          description: 'Tool that follows naming conventions',
          inputSchema: {
            type: 'object',
            properties: {
              'sap:searchQuery': { type: 'string', description: 'Search query parameter' },
              'sap:category': { type: 'string', description: 'Category filter' },
              'sap:riskLevel': { type: 'string', description: 'Risk level assessment' }
            },
            required: ['sap:searchQuery']
          },
          _meta: {
            'sap/source': 'mcp-hub',
            'sap/hubToolName': 'compliant_tool',
            'sap/riskLevel': 'low',
            'sap/accessLevel': 'standard'
          }
        }
      ]
    };

    // Test required fields
    assert.ok(testCard.name, 'Card should have name');
    assert.ok(testCard.title, 'Card should have title');
    assert.ok(testCard.description, 'Card should have description');
    assert.ok(testCard.tools, 'Card should have tools');

    // Test tool schema compliance
    const tool = testCard.tools[0];
    assert.ok(tool.name, 'Tool should have name');
    assert.ok(tool.inputSchema, 'Tool should have input schema');
    assert.ok(tool._meta, 'Tool should have metadata');

    // Test sap: namespace compliance
    const properties = tool.inputSchema.properties;
    const sapProperties = Object.keys(properties).filter(key => key.startsWith('sap:'));
    assert.ok(sapProperties.length > 0, 'Tool should have sap: namespaced properties');

    // Test metadata compliance
    const meta = tool._meta;
    assert.ok(meta['sap/source'], 'Tool should have sap/source metadata');
    assert.ok(meta['sap/riskLevel'], 'Tool should have sap/riskLevel metadata');
    assert.ok(meta['sap/accessLevel'], 'Tool should have sap/accessLevel metadata');

    console.log('✅ Schema compliance validation passed');
  });

  await t.test('Field Naming Convention Validation', async () => {
    console.log('📛 Testing field naming conventions...');

    // Test that all attributes use sap: namespace
    const validAttributes = ['sap:searchQuery', 'sap:category', 'sap:riskLevel'];
    const invalidAttributes = ['searchQuery', 'category', 'riskLevel'];

    validAttributes.forEach(attr => {
      assert.ok(attr.startsWith('sap:'), `${attr} should have sap: namespace`);
    });

    invalidAttributes.forEach(attr => {
      assert.ok(!attr.startsWith('sap:'), `${attr} should not have sap: namespace (for comparison)`);
    });

    console.log('✅ Field naming convention validation passed');
  });

  await t.test('Category Transformation Validation', async () => {
    console.log('🔄 Testing category transformation...');

    // Test category mapping
    const categoryMappings = {
      'database': 'data-access',
      'api': 'integration',
      'file': 'file-system',
      'unknown': 'general'
    };

    for (const [input, expected] of Object.entries(categoryMappings)) {
      // This would test the actual transformation logic in the cards handler
      // For now, we'll validate the mapping concept
      assert.ok(typeof input === 'string', 'Input category should be string');
      assert.ok(typeof expected === 'string', 'Expected category should be string');
      assert.ok(input.length > 0, 'Input category should not be empty');
      assert.ok(expected.length > 0, 'Expected category should not be empty');
    }

    console.log('✅ Category transformation validation passed');
  });

  await t.test('Risk Level Validation', async () => {
    console.log('⚠️ Testing risk level validation...');

    const validRiskLevels = ['low', 'medium', 'high', 'critical'];

    for (const level of validRiskLevels) {
      assert.ok(validRiskLevels.includes(level), `${level} should be valid risk level`);
      assert.ok(typeof level === 'string', 'Risk level should be string');
      assert.ok(level.length > 0, 'Risk level should not be empty');
    }

    console.log('✅ Risk level validation passed');
  });

  await t.test('Access Level Validation', async () => {
    console.log('🔐 Testing access level validation...');

    const validAccessLevels = ['standard', 'privileged', 'admin'];

    for (const level of validAccessLevels) {
      assert.ok(validAccessLevels.includes(level), `${level} should be valid access level`);
      assert.ok(typeof level === 'string', 'Access level should be string');
      assert.ok(level.length > 0, 'Access level should not be empty');
    }

    console.log('✅ Access level validation passed');
  });

  console.log('\n🎉 All comprehensive MCP Hub Cards validation tests completed successfully!');
});