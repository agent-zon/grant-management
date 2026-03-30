/**
 * MCP Hub Cards Quick Validation Test
 * 
 * This test performs a quick validation of MCP Hub cards generation
 * and can be run with the existing test runner.
 */

const yaml = require('js-yaml');

async function runMcpHubCardsValidation() {
  console.log('🧪 Running MCP Hub Cards Validation...\n');

  try {
    // Import handlers
    const McpHubHandler = require('../mcp-hub/mcp-hub-handler');
    const McpHubCardsHandler = require('../mcp-hub/mcp-hub-cards-handler');
    const GitHandler = require('../git-handler/git-handler');

    // Test configuration
    const testAgentId = 'TEST_MCP_VALIDATION';

    console.log('📦 Initializing handlers...');
    const mcpHubHandler = new McpHubHandler();
    const mcpHubCardsHandler = new McpHubCardsHandler();
    const gitHandler = new GitHandler();

    // Test 1: Load MCP Hub data
    console.log('📥 Loading MCP Hub data...');
    const mcpHubData = await mcpHubHandler.getMcpRegistryWithTools();

    if (!mcpHubData || !Array.isArray(mcpHubData) || mcpHubData.length === 0) {
      throw new Error('Failed to load MCP Hub data or data is empty');
    }

    console.log(`✅ Loaded ${mcpHubData.length} MCPs from Hub`);
    const mcpNames = mcpHubData.map(mcp => mcp.name || mcp.id).slice(0, 5);
    console.log(`   First 5 MCPs: ${mcpNames.join(', ')}`);

    // Test 2: Validate MCP Hub data structure
    console.log('🔍 Validating MCP Hub data structure...');
    let totalTools = 0;

    mcpHubData.forEach((mcp, index) => {
      if (!mcp.name && !mcp.id) {
        throw new Error(`MCP ${index} missing name/id`);
      }

      if (mcp.toolsList) {
        let tools;
        try {
          tools = JSON.parse(mcp.toolsList);
          totalTools += tools.length;
        } catch (error) {
          throw new Error(`MCP ${mcp.name} has invalid toolsList JSON: ${error.message}`);
        }
      }
    });

    console.log(`✅ Validated ${mcpHubData.length} MCPs with ${totalTools} total tools`);

    // Test 3: Generate MCP cards
    console.log(`🏗️  Generating MCP cards for test agent: ${testAgentId}...`);
    const result = await mcpHubCardsHandler.generateAndSaveMcpCards(testAgentId);

    if (!result || !result.cards || !Array.isArray(result.cards)) {
      throw new Error('MCP cards generation failed or returned invalid result');
    }

    console.log(`✅ Generated ${result.cards.length} MCP cards`);
    const cardNames = result.cards.map(card => card.name).slice(0, 5);
    console.log(`   First 5 cards: ${cardNames.join(', ')}`);

    // Test 4: Verify cards in Git
    console.log('📂 Verifying cards exist in Git...');
    const verificationPromises = result.cards.slice(0, 3).map(async (card) => {
      const gitPath = `${testAgentId}/mcps/${card.filePath}`;

      try {
        const fileContent = await gitHandler.getFileContent('AIAM', 'policies', gitPath);
        if (!fileContent || !fileContent.decodedContent) {
          throw new Error(`No content found for ${gitPath}`);
        }

        // Parse and validate YAML
        const yamlData = yaml.load(fileContent.decodedContent);
        if (!yamlData.serverInfo || !yamlData.tools || !yamlData._meta) {
          throw new Error(`Invalid YAML structure in ${gitPath}`);
        }

        return {
          name: card.name,
          path: gitPath,
          toolsCount: yamlData.tools.length,
          category: yamlData._meta['sap/category'],
          valid: true
        };
      } catch (error) {
        return {
          name: card.name,
          path: gitPath,
          error: error.message,
          valid: false
        };
      }
    });

    const verificationResults = await Promise.all(verificationPromises);
    const validCards = verificationResults.filter(r => r.valid);
    const invalidCards = verificationResults.filter(r => !r.valid);

    console.log(`✅ Verified ${validCards.length} cards in Git successfully`);
    validCards.forEach(card => {
      console.log(`   ✅ ${card.name}: ${card.toolsCount} tools, category: ${card.category}`);
    });

    if (invalidCards.length > 0) {
      console.log(`❌ ${invalidCards.length} cards failed verification:`);
      invalidCards.forEach(card => {
        console.log(`   ❌ ${card.name}: ${card.error}`);
      });
    }

    // Test 5: Data integrity spot check
    console.log('🔍 Performing data integrity spot check...');
    const sampleCard = result.cards[0];
    const sampleGitPath = `${testAgentId}/mcps/${sampleCard.filePath}`;
    const sampleContent = await gitHandler.getFileContent('AIAM', 'policies', sampleGitPath);
    const sampleYaml = yaml.load(sampleContent.decodedContent);

    // Find corresponding Hub MCP
    const hubMcp = mcpHubData.find(mcp => {
      const sanitizedName = (mcp.name || mcp.id || 'unknown-mcp')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return sanitizedName === sampleCard.name;
    });

    if (!hubMcp) {
      throw new Error(`Could not find Hub MCP for card: ${sampleCard.name}`);
    }

    // Validate data mapping
    const hubTools = hubMcp.toolsList ? JSON.parse(hubMcp.toolsList) : [];
    if (sampleYaml.tools.length !== hubTools.length) {
      throw new Error(`Tools count mismatch for ${sampleCard.name}: YAML=${sampleYaml.tools.length}, Hub=${hubTools.length}`);
    }

    console.log(`✅ Data integrity validated for sample card: ${sampleCard.name}`);
    console.log(`   Hub tools: ${hubTools.length}, YAML tools: ${sampleYaml.tools.length}`);
    console.log(`   Category: ${sampleYaml._meta['sap/category']}, Source: ${sampleYaml._meta['sap/source']}`);

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ MCP Hub Data: ${mcpHubData.length} MCPs, ${totalTools} tools`);
    console.log(`   ✅ Generated Cards: ${result.cards.length} cards`);
    console.log(`   ✅ Git Verification: ${validCards.length}/${verificationResults.length} cards verified`);
    console.log(`   ✅ Data Integrity: Sample card validated`);

    if (invalidCards.length === 0) {
      console.log('\n🎉 All MCP Hub Cards validation tests PASSED!');
      return true;
    } else {
      console.log(`\n⚠️  MCP Hub Cards validation completed with ${invalidCards.length} warnings`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ MCP Hub Cards validation FAILED:', error.message);
    console.error('   Stack trace:', error.stack);
    return false;
  }
}

// Export for use in test runner
module.exports = {
  runMcpHubCardsValidation,
  testName: 'MCP Hub Cards Validation',
  testType: 'integration'
};