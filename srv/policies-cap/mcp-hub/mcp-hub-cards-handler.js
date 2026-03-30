const yaml = require('js-yaml');
const path = require('path');
const McpHubHandler = require('./mcp-hub-handler');
const getOctokit = require('../git-handler/git-handler');

const GIT = { owner: 'AIAM', repo: 'policies' };

class McpHubCardsHandler {
  constructor() {
    this.mcpHubHandler = new McpHubHandler();
    this.baseCardTemplate = {
      $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server-card.schema.json',
      version: '1.0',
      protocolVersions: ['2025-11-25'],
      serverInfo: {},
      transport: {
        type: 'streamable-http',
        endpoint: '/mcp/hub'
      },
      capabilities: {
        tools: {},
        resources: {}
      },
      authentication: {
        required: true,
        schemas: ['oauth2', 'bearer']
      },
      _meta: {},
      tools: []
    };
  }

  /**
   * Generate MCP cards from MCP Hub data and save to Git
   * @param {string} agentId - The agent ID
   * @returns {Promise<object>} Result with created cards info
   */
  async generateAndSaveMcpCards(agentId) {
    try {
      console.log(`Generating MCP cards from MCP Hub for agent: ${agentId}`);

      // Get MCP Hub data
      const mcpHubData = await this.mcpHubHandler.getMcpRegistry();
      if (!mcpHubData || mcpHubData.length === 0) {
        console.log('No MCP Hub data available');
        return { message: 'No MCP Hub data available', cards: [] };
      }

      const createdCards = [];
      const mcpHubFolder = 'mcp-hub';

      // Process each MCP from Hub
      for (const mcp of mcpHubData) {
        try {
          const mcpCard = this.convertMcpHubToCard(mcp);
          const fileName = `${mcpCard.serverInfo.name}-hub.yaml`;
          const filePath = `${mcpHubFolder}/${fileName}`;

          // Convert to YAML
          const yamlContent = yaml.dump(mcpCard, {
            indent: 2,
            lineWidth: 80,
            quotingType: '"'
          });

          // Add header comment
          const headerComment = `# MCP Card generated from MCP Hub\n# Source: MCP Hub Registry\n# Generated: ${new Date().toISOString()}\n# MCP ID: ${mcp.id || mcp.name}\n\n`;
          const finalYamlContent = headerComment + yamlContent;

          const octokit = await getOctokit();
          const gitPath = `${agentId}/mcps/${filePath}`;
          let sha;
          try {
            const { data: existing } = await octokit.rest.repos.getContent({ ...GIT, path: gitPath });
            sha = existing.sha;
          } catch { /* new file */ }

          await octokit.rest.repos.createOrUpdateFileContents({
            ...GIT,
            path: gitPath,
            message: `Add/update MCP card for ${mcpCard.serverInfo.name} from MCP Hub`,
            content: Buffer.from(finalYamlContent, 'utf8').toString('base64'),
            ...(sha ? { sha } : {}),
          });

          createdCards.push({
            name: mcpCard.serverInfo.name,
            fileName: fileName,
            filePath: filePath,
            toolsCount: mcpCard.tools.length,
            source: 'mcp-hub'
          });

          console.log(`Created MCP card: ${fileName} with ${mcpCard.tools.length} tools`);
        } catch (error) {
          console.error(`Error processing MCP ${mcp.name || mcp.id}:`, error.message);
        }
      }

      console.log(`Generated ${createdCards.length} MCP cards from MCP Hub`);
      return {
        message: `Successfully generated ${createdCards.length} MCP cards from MCP Hub`,
        cards: createdCards
      };

    } catch (error) {
      console.error('Error generating MCP cards from Hub:', error);
      throw new Error(`Failed to generate MCP cards: ${error.message}`);
    }
  }

  /**
   * Convert MCP Hub data to MCP card format
   * @param {object} mcpData - MCP data from Hub
   * @returns {object} MCP card in standard format
   */
  convertMcpHubToCard(mcpData) {
    const card = JSON.parse(JSON.stringify(this.baseCardTemplate));

    // Basic server info
    card.serverInfo = {
      name: this.sanitizeName(mcpData.name || mcpData.id || 'unknown-mcp'),
      title: mcpData.title || mcpData.name || 'MCP Server from Hub',
      version: mcpData.version || '1.0.0',
      description: mcpData.description || 'MCP server loaded from MCP Hub registry'
    };

    // Add additional properties if available
    if (mcpData.websiteUrl) {
      card.serverInfo.websiteUrl = mcpData.websiteUrl;
    }

    // Update transport endpoint to be more specific
    card.transport.endpoint = `/mcp/hub/${card.serverInfo.name}`;

    // Meta information
    card._meta = {
      'sap/category': this.inferCategory(mcpData),
      'sap/description': `MCP server from Hub: ${card.serverInfo.title}`,
      'sap/source': 'mcp-hub',
      'sap/hubId': mcpData.id || mcpData.name,
      'sap/createdBy': mcpData.createdBy || 'mcp-hub',
      'sap/modifiedAt': mcpData.modifiedAt || new Date().toISOString()
    };

    // Add disabled status if available
    if (mcpData.disabled !== undefined) {
      card._meta['sap/disabled'] = mcpData.disabled;
    }

    // Add Joule enabled status if available
    if (mcpData.jouleEnabled !== undefined) {
      card._meta['sap/jouleEnabled'] = mcpData.jouleEnabled;
    }

    // Process tools
    card.tools = this.convertToolsFromHub(mcpData);

    return card;
  }

  /**
   * Convert tools from MCP Hub format to MCP card format
   * @param {object} mcpData - MCP data from Hub
   * @returns {Array} Array of tool definitions
   */
  convertToolsFromHub(mcpData) {
    const tools = [];

    // Try to get tools from different possible locations
    let toolsArray = mcpData.tools;

    // Check for toolsList as JSON string (MCP Hub format)
    if (!toolsArray && mcpData.toolsList) {
      try {
        toolsArray = JSON.parse(mcpData.toolsList);
      } catch (error) {
        console.error(`Failed to parse toolsList for ${mcpData.name}:`, error);
        return tools;
      }
    }

    if (!Array.isArray(toolsArray)) {
      console.log(`No tools found for MCP ${mcpData.name}`);
      return tools;
    }

    // Convert each tool
    toolsArray.forEach((tool, index) => {
      try {
        const convertedTool = {
          name: this.sanitizeToolName(tool.name || `tool-${index}`),
          title: tool.title || tool.name || `Tool ${index + 1}`,
          description: tool.description || 'Tool from MCP Hub'
        };

        // Add input schema if available
        if (tool.inputSchema) {
          convertedTool.inputSchema = this.sanitizeInputSchema(tool.inputSchema);
        }

        // Add tool metadata
        convertedTool._meta = {
          'sap/source': 'mcp-hub',
          'sap/hubToolName': tool.name || `tool-${index}`
        };

        // Infer risk level based on tool name and operations
        convertedTool._meta['sap/riskLevel'] = this.inferToolRiskLevel(tool);
        convertedTool._meta['sap/accessLevel'] = this.inferToolAccessLevel(tool);

        tools.push(convertedTool);
      } catch (error) {
        console.error(`Error converting tool ${tool.name || index}:`, error);
      }
    });

    return tools;
  }

  /**
   * Sanitize MCP name for use in file names and identifiers
   * @param {string} name - Original name
   * @returns {string} Sanitized name
   */
  sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Sanitize tool name to follow naming conventions
   * @param {string} name - Original tool name
   * @returns {string} Sanitized tool name
   */
  sanitizeToolName(name) {
    // Keep the original structure but ensure it's valid
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Sanitize input schema to ensure it's valid
   * @param {object} schema - Original schema
   * @returns {object} Sanitized schema
   */
  sanitizeInputSchema(schema) {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(schema));

    // Ensure type is set
    if (!sanitized.type) {
      sanitized.type = 'object';
    }

    // Ensure properties exist for object types
    if (sanitized.type === 'object' && !sanitized.properties) {
      sanitized.properties = {};
    }

    return sanitized;
  }

  /**
   * Infer category based on MCP data
   * @param {object} mcpData - MCP data
   * @returns {string} Inferred category
   */
  inferCategory(mcpData) {
    const name = (mcpData.name || '').toLowerCase();
    const title = (mcpData.title || '').toLowerCase();
    const description = (mcpData.description || '').toLowerCase();

    const text = `${name} ${title} ${description}`;

    // Category inference rules
    if (text.includes('commerce') || text.includes('ecommerce') || text.includes('shop')) {
      return 'commerce';
    }
    if (text.includes('procurement') || text.includes('ariba') || text.includes('purchase')) {
      return 'procurement';
    }
    if (text.includes('travel') || text.includes('expense') || text.includes('concur')) {
      return 'travel-expense';
    }
    if (text.includes('hr') || text.includes('human') || text.includes('employee')) {
      return 'hr';
    }
    if (text.includes('finance') || text.includes('accounting') || text.includes('budget')) {
      return 'finance';
    }
    if (text.includes('crm') || text.includes('customer') || text.includes('lead')) {
      return 'crm';
    }
    if (text.includes('northwind') || text.includes('demo') || text.includes('sample')) {
      return 'demo';
    }
    if (text.includes('git') || text.includes('github') || text.includes('development')) {
      return 'development';
    }
    if (text.includes('confluence') || text.includes('jira') || text.includes('collaboration')) {
      return 'collaboration';
    }

    return 'general';
  }

  /**
   * Infer tool risk level based on operations
   * @param {object} tool - Tool data
   * @returns {string} Risk level
   */
  inferToolRiskLevel(tool) {
    const name = (tool.name || '').toLowerCase();
    const description = (tool.description || '').toLowerCase();
    const text = `${name} ${description}`;

    // High risk operations
    if (text.includes('delete') || text.includes('remove') || text.includes('destroy')) {
      return 'high';
    }
    if (text.includes('create') || text.includes('insert') || text.includes('add')) {
      return 'medium';
    }
    if (text.includes('update') || text.includes('modify') || text.includes('change')) {
      return 'medium';
    }
    if (text.includes('read') || text.includes('get') || text.includes('list') || text.includes('search')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Infer tool access level based on operations
   * @param {object} tool - Tool data
   * @returns {string} Access level
   */
  inferToolAccessLevel(tool) {
    const name = (tool.name || '').toLowerCase();
    const description = (tool.description || '').toLowerCase();
    const text = `${name} ${description}`;

    // Admin level operations
    if (text.includes('admin') || text.includes('system') || text.includes('config')) {
      return 'admin';
    }
    if (text.includes('delete') || text.includes('destroy') || text.includes('remove')) {
      return 'admin';
    }

    // Privileged operations
    if (text.includes('create') || text.includes('update') || text.includes('modify')) {
      return 'privileged';
    }

    // Standard operations
    if (text.includes('read') || text.includes('get') || text.includes('list') || text.includes('search')) {
      return 'authenticated-user';
    }

    return 'authenticated-user';
  }

  /**
   * Commit and push MCP Hub cards to Git repository
   * @param {string} commitMessage - Git commit message
   * @param {string} agentId - Optional agent ID for agent-specific commits
   * @returns {object} Result of commit operation
   */
  async commitAndPushMcpCards(commitMessage = 'Update MCP Hub cards', agentId = null) {
    try {
      console.log(`Starting Git commit and push for MCP Hub cards...`);

      // Get list of files in the mcp-hub directory that need to be committed
      const mcpHubPath = agentId ? `${agentId}/mcps/mcp-hub` : 'mcp-hub';

      // Files are already committed individually by generateAndSaveMcpCards
      console.log(`Git commit completed for ${mcpHubPath}`);
      return {
        message: 'MCP Hub card files committed successfully',
        committed: true,
        filesCommitted: [`${mcpHubPath}/**/*.yaml`],
      };

    } catch (error) {
      console.error('Error committing MCP Hub cards to Git:', error);
      return {
        message: `Failed to commit MCP Hub cards: ${error.message}`,
        committed: false,
        filesCommitted: []
      };
    }
  }
}

module.exports = McpHubCardsHandler;