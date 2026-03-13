const cds = require('@sap/cds');
const fs = require('fs');
const path = require('path');
const McpHubHandler = require('./mcp-hub/mcp-hub-handler');
const GitHandler = require('./git-handler/git-handler');
const McpHubCardsHandler = require('./mcp-hub/mcp-hub-cards-handler');

module.exports = cds.service.impl(async function() {

  // Initialize MCP Hub handler
  const mcpHubHandler = new McpHubHandler();
  
  // Initialize Git handler
  const gitHandler = new GitHandler();
  
  // Initialize MCP Hub Cards handler
  const mcpHubCardsHandler = new McpHubCardsHandler();

  // READ operation - get policies for an agent
  this.on('READ', 'AgentPolicies', async (req) => {
    console.log('Loading policies from Git repository for agent:', req.data.agentId);
    
    const agentId = req.data.agentId;
    if (!agentId) {
      req.error(400, 'Agent ID is required');
      return;
    }

    try {
      // Load policies from Git repository
      const policiesPath = `${agentId}/policies.json`;
      console.log(`Loading policies from Git path: ${policiesPath}`);
      
      const gitResponse = await gitHandler.getFileContent('AIAM', 'policies', policiesPath);
      
      if (!gitResponse || !gitResponse.decodedContent) {
        console.log(`No policies found in Git for agent ${agentId}, returning default structure`);
        // Return default empty structure if no policies found
        return {
          agentId,
          policies: JSON.stringify({
            "@context": [
              "http://www.w3.org/ns/odrl.jsonld",
              {
                "sap": "https://sap.com/odrl/extensions/",
                "target": {
                  "@type": "@id"
                },
                "action": {
                  "@type": "@id"
                }
              }
            ],
            "@type": "Set",
            "permission": [],
            "prohibition": []
          }),
          yaml: '{}',
          createdAt: new Date(),
          modifiedAt: new Date()
        };
      }
      
      // Parse the policies JSON from Git
      const policiesData = JSON.parse(gitResponse.decodedContent);
      console.log(`Successfully loaded policies from Git for agent ${agentId}`);
      
      return {
        agentId,
        policies: JSON.stringify(policiesData),
        yaml: '{}', // YAML not used with Git storage
        createdAt: new Date(),
        modifiedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error loading policies from Git:', error);
      // Return default structure on error
      return {
        agentId,
        policies: JSON.stringify({
          "@context": [
            "http://www.w3.org/ns/odrl.jsonld",
            {
              "sap": "https://sap.com/odrl/extensions/",
              "target": {
                "@type": "@id"
              },
              "action": {
                "@type": "@id"
              }
            }
          ],
          "@type": "Set",
          "permission": [],
          "prohibition": []
        }),
        yaml: '{}',
        createdAt: new Date(),
        modifiedAt: new Date()
      };
    }
  });

  // CREATE/UPDATE operation - save policies for an agent
  this.on(['CREATE', 'UPDATE'], 'AgentPolicies', async (req) => {
    console.log('Saving policies to Git repository for agent:', req.data.agentId);
    
    const { agentId, policies, yaml } = req.data;
    
    if (!agentId) {
      req.error(400, 'Agent ID is required');
      return;
    }
    
    if (!policies) {
      req.error(400, 'Policies data is required');
      return;
    }
    
    const timestamp = new Date();
    
    try {
      // Parse and format the policies JSON for storage
      const policiesData = JSON.parse(policies);
      
      // Create the file path and content
      const policiesPath = `${agentId}/policies.json`;
      const fileContent = JSON.stringify(policiesData, null, 2);
      
      console.log(`Committing policies to Git path: ${policiesPath}`);
      
      // Commit and push to Git repository
      const commitResult = await gitHandler.commitFile(
        'AIAM',
        'policies',
        policiesPath,
        fileContent,
        `Update policies for agent ${agentId}`,
        'application/json'
      );
      
      if (!commitResult) {
        console.error('Failed to commit policies to Git');
        req.error(500, 'Failed to save policies to Git repository');
        return;
      }
      
      console.log('Policies saved successfully to Git repository');
      return { agentId, policies, yaml, modifiedAt: timestamp };
      
    } catch (error) {
      console.error('Error saving policies to Git:', error);
      req.error(500, `Failed to save policies: ${error.message}`);
    }
  });

  // Get YAML templates from yaml-examples directory
  this.on('getYamlTemplates', async () => {
    try {
      const yamlDir = path.join(__dirname, '../yaml-examples');
      if (!fs.existsSync(yamlDir)) {
        return [];
      }
      
      const files = fs.readdirSync(yamlDir);
      const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
      return yamlFiles;
    } catch (error) {
      console.error('Error reading YAML templates:', error);
      return [];
    }
  });

  // Get specific YAML template content
  this.on('getYamlTemplate', async (req) => {
    try {
      const { filename } = req.data;
      
      if (!filename) {
        req.error(400, 'Filename is required');
        return;
      }

      // Security: only allow yaml/yml files and prevent directory traversal
      if (!filename.match(/^[a-zA-Z0-9_-]+\.(yaml|yml)$/)) {
        req.error(400, 'Invalid filename format');
        return;
      }

      const yamlPath = path.join(__dirname, '../yaml-examples', filename);
      
      if (!fs.existsSync(yamlPath)) {
        req.error(404, `Template file ${filename} not found`);
        return;
      }

      const content = fs.readFileSync(yamlPath, 'utf8');
      return { value: content };
    } catch (error) {
      console.error('Error reading YAML template:', error);
      req.error(500, 'Failed to read template file');
    }
  });

  // Get MCP template content from mcps directory
  this.on('getMcpTemplate', async (req) => {
    try {
      const { filename } = req.data;
      
      if (!filename) {
        req.error(400, 'Filename is required');
        return;
      }

      // Security: only allow yaml/yml files and prevent directory traversal
      if (!filename.match(/^[a-zA-Z0-9_-]+\.(yaml|yml)$/)) {
        req.error(400, 'Invalid filename format');
        return;
      }

      const mcpPath = path.join(__dirname, '../yaml-examples/mcps', filename);
      
      if (!fs.existsSync(mcpPath)) {
        req.error(404, `MCP template file ${filename} not found`);
        return;
      }

      const content = fs.readFileSync(mcpPath, 'utf8');
      return { value: content };
    } catch (error) {
      console.error('Error reading MCP template:', error);
      req.error(500, 'Failed to read MCP template file');
    }
  });

  // Get MCP Hub data and convert to policies app format
  this.on('getMcpHubData', async (req) => {
    try {
      console.log('Fetching MCP Hub data...');
      
      // Check if certificates are available
      if (!mcpHubHandler.checkCertificates()) {
        console.warn('MCP Hub certificates not found, returning empty data');
        return { 
          value: JSON.stringify({
            requires: [], 
            resources: [], 
            tools: [], 
            attributes: {},
            error: 'MCP Hub certificates not found'
          })
        };
      }

      // Fetch MCP registry data
      console.log('Calling getMcpRegistryWithTools...');
      console.log('Available methods on mcpHubHandler:', Object.getOwnPropertyNames(Object.getPrototypeOf(mcpHubHandler)).filter(name => typeof mcpHubHandler[name] === 'function'));
      const mcpRegistry = await mcpHubHandler.getMcpRegistryWithTools();
      console.log('getMcpRegistryWithTools returned:', typeof mcpRegistry, mcpRegistry ? `length: ${mcpRegistry.length}` : 'null/undefined');
      
      // Convert to policies app format
      const convertedData = mcpHubHandler.convertMcpHubToPolicyFormat(mcpRegistry);
      
      console.log(`MCP Hub data converted: ${convertedData.requires.length} MCPs, ${convertedData.tools.length} tools, ${Object.keys(convertedData.attributes).length} attribute types`);
      
      return { value: JSON.stringify(convertedData) };
    } catch (error) {
      console.error('Error fetching MCP Hub data:', error);
      return { 
        value: JSON.stringify({
          requires: [], 
          resources: [], 
          tools: [], 
          attributes: {},
          error: error.message
        })
      };
    }
  });

  // Get agent manifest from Git repository
  this.on('getAgentManifest', async (req) => {
    try {
      const { agentId } = req.data;
      
      if (!agentId) {
        req.error(400, 'AgentId is required');
        return;
      }

      console.log(`Loading agent manifest for agent: ${agentId}`);
      
      // Fetch the agent manifest file from Git repository
      // Path: {agentId}/agent_manifest.yaml in the policies repo
      const manifestPath = `${agentId}/agent_manifest.yaml`;
      
      const gitResponse = await gitHandler.getFileContent('AIAM', 'policies', manifestPath);
      
      if (!gitResponse || !gitResponse.decodedContent) {
        req.error(404, `Agent manifest not found for agent: ${agentId}`);
        return;
      }
      
      console.log(`Agent manifest loaded successfully for agent: ${agentId}`);
      return { value: gitResponse.decodedContent };
      
    } catch (error) {
      console.error('Error loading agent manifest from Git:', error);
      req.error(500, `Failed to load agent manifest: ${error.message}`);
    }
  });

  // Get any file from Git repository
  this.on('getGitFile', async (req) => {
    try {
      const { filePath } = req.data;
      
      if (!filePath) {
        req.error(400, 'File path is required');
        return;
      }

      console.log(`Loading file from Git: ${filePath}`);
      
      const gitResponse = await gitHandler.getFileContent('AIAM', 'policies', filePath);
      
      if (!gitResponse || !gitResponse.decodedContent) {
        req.error(404, `File not found: ${filePath}`);
        return;
      }
      
      console.log(`File loaded successfully: ${filePath}`);
      return { value: gitResponse.decodedContent };
      
    } catch (error) {
      console.error('Error loading file from Git:', error);
      req.error(500, `Failed to load file: ${error.message}`);
    }
  });

  // Generate MCP cards from MCP Hub and save to Git
  this.on('generateMcpHubCards', async (req) => {
    try {
      const { agentId } = req.data;
      
      if (!agentId) {
        req.error(400, 'Agent ID is required');
        return;
      }

      console.log(`Generating MCP Hub cards for agent: ${agentId}`);
      
      const result = await mcpHubCardsHandler.generateAndSaveMcpCards(agentId);
      
      console.log(`MCP Hub cards generation completed for agent: ${agentId}`);
      return result;
      
    } catch (error) {
      console.error('Error generating MCP Hub cards:', error);
      req.error(500, `Failed to generate MCP Hub cards: ${error.message}`);
    }
  });

  // Commit and push MCP Hub cards to Git repository
  this.on('commitMcpHubCards', async (req) => {
    try {
      const { commitMessage, agentId } = req.data;
      
      if (!commitMessage) {
        req.error(400, 'Commit message is required');
        return;
      }

      console.log(`Committing MCP Hub cards with message: ${commitMessage}`);
      
      const result = await mcpHubCardsHandler.commitAndPushMcpCards(commitMessage, agentId);
      
      console.log(`MCP Hub cards commit completed: ${result.committed}`);
      return result;
      
    } catch (error) {
      console.error('Error committing MCP Hub cards:', error);
      req.error(500, `Failed to commit MCP Hub cards: ${error.message}`);
    }
  });

  // List all agents from Git repository
  this.on('listAllAgents', async (req) => {
    try {
      console.log('Listing all agents from Git repository...');

      // Fetch the root directory listing from Git repository
      const response = await gitHandler.listDirectory('AIAM', 'policies', '');

      if (!response || !response.length) {
        console.log('No agents found in Git repository');
        return [];
      }

      // Filter for directories only (agents are stored as directories)
      const agents = response
        .filter(item => item.type === 'dir')
        .map(item => ({
          agentId: item.name,
          modifiedAt: new Date().toISOString() // Git API might not provide this easily
        }));

      console.log(`Found ${agents.length} agents in Git repository`);
      return agents;

    } catch (error) {
      console.error('Error listing agents from Git:', error);
      req.error(500, `Failed to list agents: ${error.message}`);
    }
  });

});