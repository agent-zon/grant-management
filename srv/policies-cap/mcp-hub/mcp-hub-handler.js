const https = require('https');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

// Load environment variables
require('dotenv').config();

class McpHubHandler {
  constructor() {
    this.tokenCache = null;
    this.tokenExpiry = null;
    
    // MCP Hub OAuth configuration from environment variables
    this.oauthConfig = {
      tokenUrl: process.env.MCP_HUB_TOKEN_URL || 'https://afwnemyon.accounts400.ondemand.com/oauth2/token',
      clientId: process.env.MCP_HUB_CLIENT_ID || 'a1ed87ea-5dbf-4293-a1d0-992266125c71',
      appTid: process.env.MCP_HUB_APP_TID || 'e41fcc81-0e90-4515-bc95-4fd0a20009a6',
      username: process.env.MCP_HUB_USERNAME,
      password: process.env.MCP_HUB_PASSWORD
    };
    
    // Certificate paths from environment variables
    this.certificatePath = process.env.MCP_HUB_CERTIFICATE_PATH || path.join(__dirname, 'certificate 3.pem');
    this.privateKeyPath = process.env.MCP_HUB_PRIVATE_KEY_PATH || path.join(__dirname, 'key 3.pem');
    
    console.log('MCP Hub Handler initialized with environment configuration');
    
    // Validate that sensitive credentials are not hardcoded
    if (!process.env.MCP_HUB_USERNAME || !process.env.MCP_HUB_PASSWORD) {
      console.warn('MCP Hub credentials not found in environment variables. Please set MCP_HUB_USERNAME and MCP_HUB_PASSWORD in .env file');
    }
  }

  /**
   * Get access token for MCP Hub API
   * Uses cached token if still valid, otherwise fetches new one
   * @returns {Promise<string>} Access token
   */
  async getIdToken() {
    try {
      // Check if cached token is still valid
      if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('Using cached MCP Hub token');
        return this.tokenCache;
      }

      console.log('Fetching new MCP Hub token...');
      
      // Prepare request data
      const requestData = new URLSearchParams({
        grant_type: 'password',
        username: this.oauthConfig.username,
        password: this.oauthConfig.password,
        client_id: this.oauthConfig.clientId,
        app_tid: this.oauthConfig.appTid
      }).toString();

      // Load certificates
      const cert = fs.readFileSync(this.certificatePath);
      const key = fs.readFileSync(this.privateKeyPath);

      // Create HTTPS agent with client certificates
      const httpsAgent = new https.Agent({
        cert: cert,
        key: key,
        rejectUnauthorized: true
      });

      const token = await this.makeTokenRequest(requestData, httpsAgent);
      
      console.log('Full OAuth response:', JSON.stringify(token, null, 2));
      
      // Cache the token - use id_token for MCP Hub API (it's the JWT token)
      this.tokenCache = token.id_token || token.access_token;
      this.tokenExpiry = Date.now() + (token.expires_in ? token.expires_in * 1000 : 3600000);
      
      console.log('Successfully obtained MCP Hub token');
      return this.tokenCache;
      
    } catch (error) {
      console.error('Error getting MCP Hub token:', error.message);
      throw new Error(`Failed to authenticate with MCP Hub: ${error.message}`);
    }
  }

  /**
   * Make the actual token request
   * @param {string} requestData - Form-encoded request data
   * @param {https.Agent} httpsAgent - HTTPS agent with certificates
   * @returns {Promise<object>} Token response
   */
  async makeTokenRequest(requestData, httpsAgent) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.oauthConfig.tokenUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        agent: httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const tokenResponse = JSON.parse(responseData);
              resolve(tokenResponse);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
            }
          } catch (parseError) {
            reject(new Error(`Invalid response format: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * Get MCP registry data for all MCPs or a specific MCP ID
   * @param {string} mcpId - Optional MCP ID to fetch specific MCP (if not provided, fetches all MCPs)
   * @returns {Promise<object|array>} MCP registry data with expanded tools, prompts, and resources
   */
  async getMcpRegistry(mcpId = null) {
    try {
      console.log('=== getMcpRegistry called ===');
      if (mcpId) {
        console.log(`Fetching MCP registry data for specific ID: ${mcpId}`);
      } else {
        console.log('Fetching all MCP registry data');
      }
      
      // Get valid token
      const token = await this.getIdToken();
      
      // Construct the registry URL
      let registryUrl = 'https://022b4753-0bb2-4be1-b48a-2858a82da9c0.jupiter.prod-eu12.orbit.mcp-hub.on.dwc.tools.sap/api/registry/v1/registry-service/mcps';
      
      if (mcpId) {
        // Specific MCP with expanded details
        registryUrl += `/${mcpId}` +
          `?$expand=tools($expand=openAPIOperation($expand=api),oDataOperation($expand=api),openAPIOperationParams($select=ID,name,description,example,openAPIOperationParameter_ID),oDataOperationParams($select=ID,name,description,example,oDataOperationParameter_ID);$orderby=openAPIOperation/path,oDataOperation/path),` +
          `promptAssociations($expand=prompt($expand=mcpAssociations($expand=mcp;$orderby=mcp/name%20asc),arguments($orderby=name%20asc),messages($expand=content),resourceAssociations($expand=resource($select=ID,name,description);$orderby=resource/name%20asc));$orderby=prompt/name%20asc),` +
          `resourceAssociations($expand=resource($expand=mcpAssociations($expand=mcp;$orderby=mcp/name%20asc),contents($orderby=uri%20asc));$orderby=resource/name%20asc),` +
          `resourceTemplateAssociations($expand=resourceTemplate($expand=mcpAssociations($expand=mcp;$orderby=mcp/name%20asc));$orderby=resourceTemplate/name%20asc)`;
      } else {
        // For all MCPs, just get basic info - we'll fetch tools separately per MCP
        console.log('Getting basic MCP list (no tools expansion)...');
        // Don't expand tools here - it doesn't work properly
      }
      
      console.log('Final registry URL:', registryUrl);
      
      const registryData = await this.makeRegistryRequest(registryUrl, token);
      
      console.log('Registry response type:', typeof registryData);
      console.log('Registry response is array:', Array.isArray(registryData));
      
      if (mcpId) {
        console.log('Successfully fetched specific MCP registry data');
        console.log('Specific MCP keys:', registryData ? Object.keys(registryData) : 'null');
        console.log('Specific MCP tools:', registryData?.tools ? `${registryData.tools.length} tools` : 'no tools property');
      } else {
        const mcpCount = Array.isArray(registryData) ? registryData.length : (registryData.value ? registryData.value.length : 0);
        console.log(`Successfully fetched all MCP registry data - ${mcpCount} MCPs found`);
        
        // Debug first MCP structure
        const mcpList = Array.isArray(registryData) ? registryData : (registryData.value || []);
        if (mcpList.length > 0) {
          console.log('First MCP sample:', JSON.stringify(mcpList[0], null, 2));
          console.log('First MCP has tools:', !!mcpList[0]?.tools);
          if (mcpList[0]?.tools) {
            console.log('First MCP tools count:', mcpList[0].tools.length);
          }
        }
      }
      return registryData;
      
    } catch (error) {
      console.error('Error fetching MCP registry:', error.message);
      throw new Error(`Failed to fetch MCP registry: ${error.message}`);
    }
  }

  /**
   * Make the actual registry API request
   * @param {string} url - The registry API URL with query parameters
   * @param {string} token - Bearer token for authentication
   * @returns {Promise<object>} Registry response data
   */
  async makeRegistryRequest(url, token) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const registryResponse = JSON.parse(responseData);
              resolve(registryResponse);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
            }
          } catch (parseError) {
            reject(new Error(`Invalid response format: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.end();
    });
  }

  /**
   * Clear cached token (force refresh on next request)
   */
  clearTokenCache() {
    this.tokenCache = null;
    this.tokenExpiry = null;
    console.log('MCP Hub token cache cleared');
  }

  /**
   * Check if certificates exist
   * @returns {boolean} True if both certificate files exist
   */
  checkCertificates() {
    try {
      return fs.existsSync(this.certificatePath) && fs.existsSync(this.privateKeyPath);
    } catch (error) {
      console.error('Error checking certificates:', error.message);
      return false;
    }
  }

  /**
   * Get certificate status and paths
   * @returns {object} Certificate status information
   */
  getCertificateInfo() {
    return {
      certificatePath: this.certificatePath,
      privateKeyPath: this.privateKeyPath,
      certificateExists: fs.existsSync(this.certificatePath),
      privateKeyExists: fs.existsSync(this.privateKeyPath),
      bothExist: this.checkCertificates()
    };
  }

  /**
   * Get detailed MCP registry with tools for all MCPs
   * @returns {Promise<Array>} Array of detailed MCP data with tools
   */
  async getMcpRegistryWithTools() {
    try {
      console.log('🔧 === Fetching MCP registry with tools (DETAILED METHOD) ===');
      
      // First, try the basic list to see what we get
      const basicRegistry = await this.getMcpRegistry();
      console.log('🔧 Basic registry response type:', typeof basicRegistry);
      console.log('Basic registry is array:', Array.isArray(basicRegistry));
      console.log('Basic registry length:', Array.isArray(basicRegistry) ? basicRegistry.length : (basicRegistry?.value?.length || 'no value array'));
      
      // Get the actual MCP list
      const mcpList = Array.isArray(basicRegistry) ? basicRegistry : (basicRegistry.value || []);
      console.log(`Processing ${mcpList.length} MCPs from basic registry`);
      
      if (mcpList.length === 0) {
        console.warn('No MCPs found in basic registry');
        return [];
      }
      
      // Log first MCP to understand structure
      if (mcpList[0]) {
        console.log('First MCP structure:', JSON.stringify(mcpList[0], null, 2));
      }
      
      // Check if any MCP already has tools
      const mcpsWithTools = mcpList.filter(mcp => mcp.tools && mcp.tools.length > 0);
      if (mcpsWithTools.length > 0) {
        console.log(`Found ${mcpsWithTools.length} MCPs with tools in basic registry, using directly`);
        return mcpList;
      }
      
      // Try to fetch detailed information for each MCP
      console.log('Basic registry has no tools, trying detailed calls for each MCP...');
      const detailedMcps = [];
      
      for (let i = 0; i < mcpList.length; i++) {
        const mcp = mcpList[i];
        const mcpId = mcp.id || mcp.name || `mcp-${i}`;
        const mcpName = mcp.name || mcp.id || mcp.title || `mcp-${i}`;
        
        try {
          console.log(`[${i+1}/${mcpList.length}] Fetching detailed info for: ${mcpName} (ID: ${mcpId})`);
          
          const detailedMcp = await this.getMcpRegistry(mcpId);
          
          if (detailedMcp && typeof detailedMcp === 'object') {
            console.log(`Detailed response for ${mcpName}:`, Object.keys(detailedMcp));
            
            if (detailedMcp.tools) {
              console.log(`✓ Found ${detailedMcp.tools.length} tools in ${mcpName}`);
            } else {
              console.log(`✗ No tools in detailed response for ${mcpName}`);
            }
            
            detailedMcps.push(detailedMcp);
          } else {
            console.warn(`Invalid detailed response for ${mcpName}, using basic info`);
            detailedMcps.push(mcp);
          }
        } catch (error) {
          console.error(`Failed to get detailed info for ${mcpName}:`, error.message);
          detailedMcps.push(mcp);
        }
      }
      
      console.log(`=== Completed detailed fetching for ${detailedMcps.length} MCPs ===`);
      return detailedMcps;
      
    } catch (error) {
      console.error('Error in getMcpRegistryWithTools:', error);
      // Fallback to basic registry
      try {
        console.log('Falling back to basic registry...');
        const fallback = await this.getMcpRegistry();
        return Array.isArray(fallback) ? fallback : (fallback.value || []);
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Convert MCP Hub data to policies app format
   * @param {array} mcpRegistry - Array of MCP data from the registry
   * @returns {object} Converted data in policies app format
   */
  convertMcpHubToPolicyFormat(mcpRegistry) {
    try {
      console.log('Converting MCP registry to policy format. Registry length:', mcpRegistry?.length || 'undefined');
      console.log('First MCP structure:', mcpRegistry?.[0] ? JSON.stringify(mcpRegistry[0], null, 2) : 'none');
      
      const result = {
        requires: [],
        resources: [],
        tools: [],
        attributes: {}
      };

      if (!mcpRegistry || !Array.isArray(mcpRegistry)) {
        console.warn('Invalid MCP registry format');
        return result;
      }

      mcpRegistry.forEach((mcp, index) => {
        console.log(`Processing MCP ${index}:`, JSON.stringify(mcp, null, 2));
        
        // Extract MCP name/id with better fallback logic
        const mcpName = mcp.name || mcp.id || mcp.title || `mcp-${index}`;
        const mcpId = mcp.id || mcp.name || `mcp-${index}`;
        
        console.log(`MCP name: ${mcpName}, id: ${mcpId}`);
        console.log(`MCP data structure:`, Object.keys(mcp));
        console.log(`MCP tools array:`, mcp.tools ? `${mcp.tools.length} tools` : 'no tools array');
        
        // Check for tools in different possible locations
        let toolsArray = mcp.tools;
        if (!toolsArray && mcp.value && mcp.value.tools) {
          console.log('Found tools in mcp.value.tools');
          toolsArray = mcp.value.tools;
        }
        if (!toolsArray && mcp.data && mcp.data.tools) {
          console.log('Found tools in mcp.data.tools');
          toolsArray = mcp.data.tools;
        }
        
        // Check for toolsList as JSON string (MCP Hub format)
        if (!toolsArray && mcp.toolsList) {
          try {
            console.log(`Found toolsList for ${mcpName}, parsing JSON...`);
            toolsArray = JSON.parse(mcp.toolsList);
            console.log(`Successfully parsed ${toolsArray.length} tools from toolsList`);
          } catch (error) {
            console.error(`Failed to parse toolsList for ${mcpName}:`, error);
          }
        }
        
        if (toolsArray) {
          console.log(`Tools for ${mcpName}:`, toolsArray.map(t => t.name || t.id || 'unnamed'));
        }
        
        // Add MCP server to requires
        result.requires.push({
          name: mcpName,
          type: 'mcp-server',
          title: mcp.title || mcpName,
          description: mcp.description || '',
          source: 'mcp-hub',
          id: mcpId
        });

        // Process tools if found
        if (toolsArray && Array.isArray(toolsArray)) {
          console.log(`Processing ${toolsArray.length} tools for ${mcpName}`);
          toolsArray.forEach((tool, toolIndex) => {
            const toolName = tool.name || tool.id || `tool-${toolIndex}`;
            console.log(`Processing tool ${toolIndex}: ${toolName}`);
            
            const mcpTool = {
              name: `${mcpName}:${toolName}`,
              type: 'mcp-tool',
              mcpServer: mcpName,
              toolName: toolName,
              title: tool.title || toolName,
              description: tool.description || '',
              source: 'mcp-hub',
              _meta: {}
            };

            // Extract attributes from tool input schema
            if (tool.inputSchema && tool.inputSchema.properties) {
              this.extractAttributesFromSchema(tool.inputSchema.properties, result.attributes, toolName);
              
              // Add common attributes to tool meta for backward compatibility
              if (result.attributes.category) {
                mcpTool._meta['sap/category'] = Array.from(result.attributes.category)[0];
              }
            }

            result.tools.push(mcpTool);
            console.log(`Added tool to result: ${mcpTool.name}`);
          });
        } else {
          console.log(`No tools array found for ${mcpName}. MCP properties:`, Object.keys(mcp));
        }

        // Extract MCP-level attributes with better property handling
        if (mcp.title) {
          if (!result.attributes.mcpTitle) result.attributes.mcpTitle = new Set();
          result.attributes.mcpTitle.add(mcp.title);
        }

        if (mcp.version) {
          if (!result.attributes.version) result.attributes.version = new Set();
          result.attributes.version.add(mcp.version);
        }

        if (mcp.createdBy) {
          if (!result.attributes.createdBy) result.attributes.createdBy = new Set();
          result.attributes.createdBy.add(mcp.createdBy);
        }

        if (mcp.disabled !== undefined) {
          if (!result.attributes.disabled) result.attributes.disabled = new Set();
          result.attributes.disabled.add(String(mcp.disabled));
        }

        if (mcp.jouleEnabled !== undefined) {
          if (!result.attributes.jouleEnabled) result.attributes.jouleEnabled = new Set();
          result.attributes.jouleEnabled.add(String(mcp.jouleEnabled));
        }
      });

      // Convert Sets to Arrays for JSON serialization
      Object.keys(result.attributes).forEach(key => {
        result.attributes[key] = Array.from(result.attributes[key]);
      });

      console.log(`MCP Hub conversion complete: ${result.requires.length} servers, ${result.tools.length} tools, ${Object.keys(result.attributes).length} attribute types`);
      console.log('Tools summary:', result.tools.map(t => `${t.mcpServer}:${t.toolName}`));

      return result;
    } catch (error) {
      console.error('Error converting MCP Hub data:', error);
      return { requires: [], resources: [], tools: [], attributes: {} };
    }
  }

  /**
   * Extract attributes from JSON schema properties
   * @param {object} properties - JSON schema properties
   * @param {object} attributesMap - Map of attribute types to Sets of values
   * @param {string} toolName - Name of the tool for context
   */
  extractAttributesFromSchema(properties, attributesMap, toolName) {
    Object.keys(properties).forEach(propName => {
      const prop = properties[propName];
      
      // Add property name as an attribute type
      if (!attributesMap[propName]) {
        attributesMap[propName] = new Set();
      }

      // Extract enum values as possible attribute values
      if (prop.enum && Array.isArray(prop.enum)) {
        prop.enum.forEach(enumValue => {
          attributesMap[propName].add(String(enumValue));
        });
      }

      // Extract example values as possible attribute values
      if (prop.example) {
        if (Array.isArray(prop.example)) {
          prop.example.forEach(exampleValue => {
            attributesMap[propName].add(String(exampleValue));
          });
        } else {
          attributesMap[propName].add(String(prop.example));
        }
      }

      // Extract type-based common values
      if (prop.type === 'boolean') {
        attributesMap[propName].add('true');
        attributesMap[propName].add('false');
      }

      // Handle nested objects (like expand, select, filter properties in OData)
      if (prop.type === 'object' && prop.properties) {
        this.extractAttributesFromSchema(prop.properties, attributesMap, toolName);
      }

      // Handle array items
      if (prop.type === 'array' && prop.items && prop.items.properties) {
        this.extractAttributesFromSchema(prop.items.properties, attributesMap, toolName);
      }
    });
  }
}

module.exports = McpHubHandler;