const McpHubHandler = require('./mcp-hub-handler');

async function testMcpHubHandler() {
  console.log('=== Testing MCP Hub Handler ===\n');
  
  const mcpHub = new McpHubHandler();
  
  // Test 1: Check certificate files
  console.log('1. Checking certificates...');
  const certInfo = mcpHub.getCertificateInfo();
  console.log('Certificate path:', certInfo.certificatePath);
  console.log('Private key path:', certInfo.privateKeyPath);
  console.log('Certificate exists:', certInfo.certificateExists);
  console.log('Private key exists:', certInfo.privateKeyExists);
  console.log('Both certificates ready:', certInfo.bothExist);
  console.log('');
  
  if (!certInfo.bothExist) {
    console.log('❌ Certificate files missing! Please ensure both files are in the mcp-hub folder:');
    console.log('  - certificate.pem');
    console.log('  - private_key.pem');
    return;
  }
  
  // Test 2: Get token
  try {
    console.log('2. Testing token authentication...');
    console.log('Attempting to get ID token...');
    
    const startTime = Date.now();
    const token = await mcpHub.getIdToken();
    const endTime = Date.now();
    
    console.log('✅ Successfully obtained token!');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    console.log('Full ID token:', token);
    console.log('Request took:', endTime - startTime, 'ms');
    console.log('');
    
    // Test 3: Test token caching
    console.log('3. Testing token caching...');
    const cacheStartTime = Date.now();
    const cachedToken = await mcpHub.getIdToken();
    const cacheEndTime = Date.now();
    
    console.log('Cache request took:', cacheEndTime - cacheStartTime, 'ms');
    console.log('Tokens match:', token === cachedToken);
    console.log('');
    
    // Test 4: Clear cache and get fresh token
    console.log('4. Testing cache clearing...');
    mcpHub.clearTokenCache();
    
    const freshStartTime = Date.now();
    const freshToken = await mcpHub.getIdToken();
    const freshEndTime = Date.now();
    
    console.log('Fresh token request took:', freshEndTime - freshStartTime, 'ms');
    console.log('Fresh token length:', freshToken.length);
    console.log('');
    
    // Test 5: Test MCP Registry API call (all MCPs)
    console.log('5. Testing MCP Registry API (all MCPs)...');
    try {
      const registryStartTime = Date.now();
      const allMcpsData = await mcpHub.getMcpRegistry();
      const registryEndTime = Date.now();
      
      console.log('✅ Successfully fetched all MCP registry data!');
      console.log('Registry request took:', registryEndTime - registryStartTime, 'ms');
      console.log('Full response structure:', JSON.stringify(allMcpsData, null, 2));
      
      // Handle both array response and OData value-wrapped response
      const mcpArray = Array.isArray(allMcpsData) ? allMcpsData : (allMcpsData.value || []);
      console.log('Total MCPs found:', mcpArray.length);
      
      if (mcpArray.length > 0) {
        console.log('Sample MCPs:');
        mcpArray.slice(0, 3).forEach((mcp, idx) => {
          console.log(`  ${idx + 1}. ${mcp.name || 'Unnamed'} (ID: ${mcp.ID}) - ${mcp.description || 'No description'}`);
        });
        console.log('');
        
        // Create structured JSON output with all MCPs and their tools
        console.log('6. Creating structured MCP and tools JSON...');
        const structuredMcpData = {
          totalMcps: mcpArray.length,
          mcps: []
        };
        
        for (const mcp of mcpArray) {
          const mcpInfo = {
            id: mcp.ID,
            name: mcp.name,
            title: mcp.title,
            description: mcp.description,
            version: mcp.version,
            disabled: mcp.disabled,
            isMetaMcpServer: mcp.isMetaMcpServer,
            jouleEnabled: mcp.jouleEnabled,
            createdAt: mcp.createdAt,
            createdBy: mcp.createdBy,
            modifiedAt: mcp.modifiedAt,
            modifiedBy: mcp.modifiedBy,
            tools: []
          };
          
          // Parse tools from toolsList if available
          if (mcp.toolsList) {
            try {
              const parsedTools = JSON.parse(mcp.toolsList);
              mcpInfo.tools = parsedTools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
              }));
            } catch (parseError) {
              console.log(`Warning: Could not parse tools for ${mcp.name}:`, parseError.message);
            }
          }
          
          structuredMcpData.mcps.push(mcpInfo);
        }
        
        console.log('\n=== STRUCTURED MCP AND TOOLS JSON ===');
        console.log(JSON.stringify(structuredMcpData, null, 2));
        console.log('=== END STRUCTURED JSON ===\n');
        
        // Summary
        const totalTools = structuredMcpData.mcps.reduce((sum, mcp) => sum + mcp.tools.length, 0);
        console.log(`Summary: ${structuredMcpData.totalMcps} MCPs with ${totalTools} total tools`);
      } else {
        console.log('No MCPs found. This might indicate:');
        console.log('1. The user has no access to any MCPs');
        console.log('2. All MCPs are in a different scope/tenant');
        console.log('3. Additional query parameters might be needed');
      }
      console.log('');
      
    } catch (registryError) {
      console.log('❌ MCP Registry test failed:', registryError.message);
      console.log('Note: This might be expected if the registry endpoint is restricted');
      console.log('');
    }
    
    console.log('=== All tests completed successfully! ===');
    
  } catch (error) {
    console.log('❌ Error during token test:', error.message);
    console.log('');
    
    // Provide troubleshooting suggestions
    console.log('Troubleshooting suggestions:');
    console.log('1. Verify certificate files are valid PEM format');
    console.log('2. Check network connectivity to:', mcpHub.oauthConfig.tokenUrl);
    console.log('3. Verify credentials are correct');
    console.log('4. Check if certificates match the client_id');
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('5. DNS resolution issue - check internet connection');
    }
    if (error.message.includes('certificate')) {
      console.log('5. Certificate issue - verify PEM files are valid');
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('5. Authentication issue - verify credentials and certificates');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMcpHubHandler().catch(console.error);
}

module.exports = testMcpHubHandler;