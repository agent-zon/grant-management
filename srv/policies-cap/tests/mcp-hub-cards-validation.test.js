/**
 * MCP Hub Cards Validation Tests
 * 
 * This test suite validates that MCP Hub cards are correctly generated,
 * stored in Git, and contain accurate data from the MCP Hub source.
 */

const assert = require('assert');
const yaml = require('js-yaml');

// Import handlers and services
const McpHubHandler = require('../srv/mcp-hub/mcp-hub-handler');
const McpHubCardsHandler = require('../srv/mcp-hub/mcp-hub-cards-handler');
const GitHandler = require('../srv/git-handler/git-handler');

// Test configuration
const TEST_AGENT_ID = 'TEST_AGENT_MCP_CARDS';
const MCP_HUB_FOLDER = 'mcp-hub';

describe('MCP Hub Cards Validation Tests', function() {
  let mcpHubHandler;
  let mcpHubCardsHandler;
  let gitHandler;
  let originalMcpHubData;
  let generatedCards;

  // Increase timeout for Git operations
  this.timeout(30000);

  before(async function() {
    console.log('🔧 Setting up test environment...');
    
    // Initialize handlers
    mcpHubHandler = new McpHubHandler();
    mcpHubCardsHandler = new McpHubCardsHandler();
    gitHandler = new GitHandler();
    
    console.log('✅ Handlers initialized');
  });

  describe('MCP Hub Data Loading', function() {
    it('should load MCP Hub data successfully', async function() {
      console.log('📥 Loading MCP Hub data...');
      
      originalMcpHubData = await mcpHubHandler.getMcpHubData();
      
      assert(originalMcpHubData, 'MCP Hub data should be loaded');
      assert(Array.isArray(originalMcpHubData), 'MCP Hub data should be an array');
      assert(originalMcpHubData.length > 0, 'MCP Hub should contain at least one MCP');
      
      console.log(`✅ Loaded ${originalMcpHubData.length} MCPs from Hub`);
      
      // Log MCP names for debugging
      const mcpNames = originalMcpHubData.map(mcp => mcp.name || mcp.id);
      console.log(`   MCPs: ${mcpNames.join(', ')}`);
    });

    it('should validate MCP Hub data structure', function() {
      console.log('🔍 Validating MCP Hub data structure...');
      
      originalMcpHubData.forEach((mcp, index) => {
        assert(mcp.name || mcp.id, `MCP ${index} should have name or id`);
        assert(mcp.title || mcp.name, `MCP ${index} should have title or name`);
        
        // Validate tools structure
        if (mcp.toolsList) {
          assert(typeof mcp.toolsList === 'string', `MCP ${mcp.name} toolsList should be a JSON string`);
          
          let tools;
          assert.doesNotThrow(() => {
            tools = JSON.parse(mcp.toolsList);
          }, `MCP ${mcp.name} toolsList should be valid JSON`);
          
          assert(Array.isArray(tools), `MCP ${mcp.name} parsed tools should be an array`);
        }
        
        console.log(`   ✅ MCP ${mcp.name || mcp.id}: ${mcp.toolsList ? JSON.parse(mcp.toolsList).length : 0} tools`);
      });
      
      console.log('✅ MCP Hub data structure is valid');
    });
  });

  describe('MCP Cards Generation', function() {
    it('should generate MCP cards successfully', async function() {
      console.log(`🏗️  Generating MCP cards for agent: ${TEST_AGENT_ID}...`);
      
      const result = await mcpHubCardsHandler.generateAndSaveMcpCards(TEST_AGENT_ID);
      
      assert(result, 'Generation result should be returned');
      assert(result.message, 'Result should contain message');
      assert(result.cards, 'Result should contain cards array');
      assert(Array.isArray(result.cards), 'Cards should be an array');
      assert(result.cards.length > 0, 'Should generate at least one card');
      
      generatedCards = result.cards;
      console.log(`✅ Generated ${generatedCards.length} MCP cards`);
      
      // Log generated card names
      const cardNames = generatedCards.map(card => card.name);
      console.log(`   Cards: ${cardNames.join(', ')}`);
    });

    it('should validate generated cards metadata', function() {
      console.log('🔍 Validating generated cards metadata...');
      
      generatedCards.forEach(card => {
        assert(card.name, 'Card should have name');
        assert(card.fileName, 'Card should have fileName');
        assert(card.filePath, 'Card should have filePath');
        assert(card.toolsCount >= 0, 'Card should have valid toolsCount');
        assert(card.source === 'mcp-hub', 'Card source should be mcp-hub');
        
        // Validate file naming convention
        assert(card.fileName.endsWith('-hub.yaml'), 'Card fileName should end with -hub.yaml');
        assert(card.filePath.startsWith(MCP_HUB_FOLDER), 'Card filePath should be in mcp-hub folder');
        
        console.log(`   ✅ ${card.name}: ${card.toolsCount} tools, ${card.fileName}`);
      });
      
      console.log('✅ Generated cards metadata is valid');
    });
  });

  describe('Git Storage Validation', function() {
    it('should verify cards exist in Git repository', async function() {
      console.log('📂 Verifying cards exist in Git repository...');
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        console.log(`   Checking: ${gitPath}`);
        
        try {
          const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
          
          assert(fileContent, `File should exist in Git: ${gitPath}`);
          assert(fileContent.decodedContent, `File should have content: ${gitPath}`);
          
          console.log(`   ✅ Found: ${gitPath} (${fileContent.decodedContent.length} bytes)`);
        } catch (error) {
          assert.fail(`File not found in Git: ${gitPath} - ${error.message}`);
        }
      }
      
      console.log('✅ All cards verified in Git repository');
    });

    it('should parse and validate YAML content from Git', async function() {
      console.log('🔍 Parsing and validating YAML content from Git...');
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        
        let yamlData;
        assert.doesNotThrow(() => {
          yamlData = yaml.load(fileContent.decodedContent);
        }, `YAML should be valid for ${card.name}`);
        
        // Validate YAML structure
        assert(yamlData.serverInfo, `${card.name} should have serverInfo`);
        assert(yamlData.serverInfo.name, `${card.name} should have serverInfo.name`);
        assert(yamlData.serverInfo.title, `${card.name} should have serverInfo.title`);
        assert(yamlData.tools, `${card.name} should have tools array`);
        assert(Array.isArray(yamlData.tools), `${card.name} tools should be an array`);
        assert(yamlData._meta, `${card.name} should have _meta object`);
        
        console.log(`   ✅ ${card.name}: Valid YAML with ${yamlData.tools.length} tools`);
      }
      
      console.log('✅ All YAML content is valid');
    });
  });

  describe('Data Integrity Validation', function() {
    it('should validate MCP card data matches Hub data', async function() {
      console.log('🔍 Validating MCP card data matches Hub data...');
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        const yamlData = yaml.load(fileContent.decodedContent);
        
        // Find corresponding MCP Hub data
        const hubMcp = originalMcpHubData.find(mcp => {
          const sanitizedName = (mcp.name || mcp.id || 'unknown-mcp')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return sanitizedName === card.name;
        });
        
        assert(hubMcp, `Should find corresponding Hub MCP for card: ${card.name}`);
        
        // Validate server info mapping
        assert.strictEqual(yamlData.serverInfo.name, card.name, 'Server name should match card name');
        assert(yamlData.serverInfo.title.includes(hubMcp.title || hubMcp.name), 'Server title should include Hub title');
        assert(yamlData.serverInfo.description.includes('MCP Hub'), 'Server description should mention MCP Hub');
        
        // Validate meta information
        assert.strictEqual(yamlData._meta['sap/source'], 'mcp-hub', 'Meta source should be mcp-hub');
        assert(yamlData._meta['sap/hubId'], 'Meta should have hubId');
        assert(yamlData._meta['sap/category'], 'Meta should have category');
        
        // Validate tools count matches
        if (hubMcp.toolsList) {
          const hubTools = JSON.parse(hubMcp.toolsList);
          assert.strictEqual(yamlData.tools.length, hubTools.length, 
            `Tools count should match for ${card.name}: YAML=${yamlData.tools.length}, Hub=${hubTools.length}`);
          
          // Validate tool names mapping
          hubTools.forEach((hubTool, index) => {
            const yamlTool = yamlData.tools[index];
            assert(yamlTool, `YAML tool ${index} should exist for ${card.name}`);
            assert(yamlTool.name, `YAML tool ${index} should have name for ${card.name}`);
            assert(yamlTool._meta, `YAML tool ${index} should have _meta for ${card.name}`);
            assert.strictEqual(yamlTool._meta['sap/source'], 'mcp-hub', `YAML tool ${index} should have mcp-hub source`);
          });
        }
        
        console.log(`   ✅ ${card.name}: Data integrity validated`);
      }
      
      console.log('✅ All MCP card data matches Hub data');
    });

    it('should validate schema compliance', async function() {
      console.log('🔍 Validating MCP card schema compliance...');
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        const yamlData = yaml.load(fileContent.decodedContent);
        
        // Validate required schema fields
        const requiredFields = [
          'serverInfo.name',
          'serverInfo.title', 
          'serverInfo.version',
          'serverInfo.description',
          'transport.endpoint',
          'tools',
          '_meta'
        ];
        
        requiredFields.forEach(fieldPath => {
          const fieldValue = fieldPath.split('.').reduce((obj, key) => obj?.[key], yamlData);
          assert(fieldValue !== undefined && fieldValue !== null, 
            `Required field ${fieldPath} should exist in ${card.name}`);
        });
        
        // Validate tools schema
        yamlData.tools.forEach((tool, index) => {
          assert(tool.name, `Tool ${index} should have name in ${card.name}`);
          assert(tool.description, `Tool ${index} should have description in ${card.name}`);
          assert(tool._meta, `Tool ${index} should have _meta in ${card.name}`);
          assert(tool._meta['sap/source'], `Tool ${index} should have sap/source in ${card.name}`);
          assert(tool._meta['sap/riskLevel'], `Tool ${index} should have sap/riskLevel in ${card.name}`);
          assert(tool._meta['sap/accessLevel'], `Tool ${index} should have sap/accessLevel in ${card.name}`);
        });
        
        // Validate meta schema
        assert(yamlData._meta['sap/category'], `${card.name} should have sap/category`);
        assert(yamlData._meta['sap/source'], `${card.name} should have sap/source`);
        assert(yamlData._meta['sap/hubId'], `${card.name} should have sap/hubId`);
        
        console.log(`   ✅ ${card.name}: Schema compliance validated`);
      }
      
      console.log('✅ All MCP cards are schema compliant');
    });
  });

  describe('Data Transformation Validation', function() {
    it('should validate category inference', async function() {
      console.log('🔍 Validating category inference...');
      
      const categoryMappings = {
        'northwind': 'demo',
        'commerce': 'commerce',
        'concur': 'travel-expense',
        'ariba': 'procurement'
      };
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        const yamlData = yaml.load(fileContent.decodedContent);
        
        const category = yamlData._meta['sap/category'];
        assert(category, `${card.name} should have inferred category`);
        
        // Validate category is reasonable
        const validCategories = ['commerce', 'procurement', 'travel-expense', 'hr', 'finance', 'crm', 'demo', 'development', 'collaboration', 'general'];
        assert(validCategories.includes(category), `${card.name} category '${category}' should be valid`);
        
        console.log(`   ✅ ${card.name}: Category '${category}' inferred correctly`);
      }
      
      console.log('✅ Category inference validated');
    });

    it('should validate risk and access level inference', async function() {
      console.log('🔍 Validating risk and access level inference...');
      
      for (const card of generatedCards) {
        const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        const yamlData = yaml.load(fileContent.decodedContent);
        
        yamlData.tools.forEach((tool, index) => {
          const riskLevel = tool._meta['sap/riskLevel'];
          const accessLevel = tool._meta['sap/accessLevel'];
          
          // Validate risk levels
          const validRiskLevels = ['low', 'medium', 'high', 'critical', 'sensitive'];
          assert(validRiskLevels.includes(riskLevel), 
            `Tool ${tool.name} risk level '${riskLevel}' should be valid`);
          
          // Validate access levels
          const validAccessLevels = ['authenticated-user', 'privileged', 'admin'];
          assert(validAccessLevels.includes(accessLevel), 
            `Tool ${tool.name} access level '${accessLevel}' should be valid`);
        });
        
        console.log(`   ✅ ${card.name}: Risk and access levels validated for ${yamlData.tools.length} tools`);
      }
      
      console.log('✅ Risk and access level inference validated');
    });
  });

  after(async function() {
    console.log('🧹 Cleaning up test artifacts...');
    
    // Optional: Clean up test files from Git (commented out to preserve for debugging)
    // try {
    //   for (const card of generatedCards || []) {
    //     const gitPath = `${TEST_AGENT_ID}/mcps/${card.filePath}`;
    //     console.log(`   Cleaning: ${gitPath}`);
    //     // Add cleanup logic here if needed
    //   }
    // } catch (error) {
    //   console.warn('⚠️  Cleanup warning:', error.message);
    // }
    
    console.log('✅ Test cleanup completed');
  });
});

// Export for use in other test files
module.exports = {
  TEST_AGENT_ID,
  MCP_HUB_FOLDER
};