import xssec from "@sap/xssec";
import axios from "axios";
import {
  createSecurityContext,
  XsuaaService,
  SECURITY_CONTEXT,
  errors,
  IdentityService,
} from "@sap/xssec";
const { ValidationError } = errors;
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";

var credentials = cds.env.requires.auth.credentials;
const authService = new IdentityService(credentials);
const apiUrl =
  "https://v1-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com";
class TokenService {
  constructor() {
    this.tokens = new Map();
  }

  async getToken(serviceName) {
    try {
      console.log(`🔐 Getting token for service: ${serviceName}`);

      // Check if we already have a valid token
      const cached = this.tokens.get(serviceName);
      if (cached && cached.expires_in > Date.now()) {
        console.log(`🔐 Using cached token for ${serviceName}`);
        return cached;
      }

      // In a real implementation, you would use xssec to get the token
      // For this demo, we'll simulate the token acquisition process

      // Simulate xssec token acquisition
      const token = await authService.fetchClientCredentialsToken({
        // resource: `urn:sap:identity:application:provider:name:${serviceName}`
        audience: "1a977efc-688c-4888-bb3b-f850d2ab20d0", // Approuter client ID
      });

      // Cache the token (simulate 1 hour expiry)
      this.tokens.set(serviceName, token);

      console.log(
        `🔐 Token acquired for ${serviceName}: ${token.access_token.substring(
          0,
          50
        )}...`
      );
      //print the token claims
      console.log(
        `🔐 Token claims: ${JSON.stringify(
          jwtDecode(token.access_token),
          null,
          2
        )}`
      );
      return token;
    } catch (error) {
      console.error(`❌ Error getting token for ${serviceName}:`, error);
      throw error;
    }
  }

  async makeAuthenticatedRequest(serviceName, url, options = {}) {
    try {
      const { access_token } = await this.getToken(serviceName);

      const requestOptions = {
        ...options,
        headers: {
          "x-vcap-application-id": serviceName,
          "x-approuter-authorization": `Bearer ${access_token}`,
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
          ...options.headers,
        },
      };

      console.log(`🔗 Making authenticated request to ${url}`);
      const response = await axios(url, requestOptions);

      console.log(`✅ Request successful: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`❌ Authenticated request failed:`, error.message);
      throw error;
    }
  }

  async testUserService() {
    console.log("\n📡 Testing User Service with XSSEC Token...");

    try {
      // Test user endpoints
      const endpoints = [
        "/user-api/attributes",
        "/user-api/currentUser",
        "/auth/api/me",
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeAuthenticatedRequest(
            "user-api",
            `${apiUrl}${endpoint}`,
            { timeout: 10000 }
          );

          console.log(`   ✅ ${endpoint}: ${response.status}`);
          console.log(`   Data: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
          console.log(
            `   ⚠️  ${endpoint}: ${error.response?.status || error.message}`
          );
        }
      }
    } catch (error) {
      console.log(`   ❌ User service test failed: ${error.message}`);
    }
  }

  async testResearcherService() {
    console.log("\n📡 Testing Researcher Service with XSSEC Token...");

    try {
      // Test researcher endpoints
      const endpoints = ["/researcher/"];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeAuthenticatedRequest(
            "researcher-api",
            `${apiUrl}${endpoint}`,
            { timeout: 10000 }
          );

          console.log(`   ✅ ${endpoint}: ${response.status}`);
          console.log(`   Data: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
          console.log(
            `   ⚠️  ${endpoint}: ${error.response?.status || error.message}`
          );
        }
      }
    } catch (error) {
      console.log(`   ❌ Researcher service test failed: ${error.message}`);
    }
  }

  generateEventSourceUrl(serviceName, baseUrl, endpoint, chatId = "test") {
    return async () => {
      const token = await this.getToken(serviceName);
      const url = `${baseUrl}${endpoint}?chatId=${chatId}&token=${encodeURIComponent(
        token
      )}`;
      console.log(`🔗 EventSource URL: ${url}`);
      return url;
    };
  }
}

function createTokenService() {
  return new TokenService();
}

// Run tests if called directly

async function runTests() {
  console.log("🚀 Running XSSEC Token Service Tests\n");

  const tokenService = new TokenService();

  try {
    // Test token acquisition
    await tokenService.getToken("user-api");
    // Test service calls
    await tokenService.testUserService();

    await tokenService.testResearcherService();

    // Test EventSource URL generation
    console.log("\n📡 Testing EventSource URL Generation...");
  } catch (error) {
    console.error("❌ Error during tests:", error.message);
  }
}

if (import.meta.url === new URL(import.meta.url).href) {
  runTests().catch(console.error);
}

export { runTests, TokenService };
