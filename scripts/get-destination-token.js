#!/usr/bin/env node

/**
 * Simple script to retrieve OAuth token from SAP Destination Service
 * Uses hardcoded credentials for XSUAA/IAS authentication
 */

import fetch from "node-fetch";

// Hardcoded credentials
const credentials = {
  clientid:
    "sb-cloned779da6d57394c96b1a1693755f831ce!b1328962|destination-xsappname!b9",
  clientsecret:
    "aeede5d2-c5c9-4e4a-a152-cb4697a14e30$P3GoSKI0WPYDzfSLgyinJiO5iuxdZKla27_tjoRlM70=",
  uaadomain: "authentication.eu12.hana.ondemand.com",
  url: "https://experiments-1234.authentication.eu12.hana.ondemand.com",
  identityzone: "experiments-1234",
};

/**
 * Get OAuth token using client credentials flow
 */
async function getToken() {
  const tokenUrl = `${credentials.url}/oauth/token`;

  // Prepare the request body for client credentials grant
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientid,
    client_secret: credentials.clientsecret,
  });

  try {
    console.log("🔐 Requesting token from:", tokenUrl);
    console.log("📋 Using client ID:", credentials.clientid);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const tokenData = await response.json();

    console.log("\n✅ Token retrieved successfully!\n");
    console.log("📄 Token Response:");
    console.log(JSON.stringify(tokenData, null, 2));

    if (tokenData.access_token) {
      console.log(
        "\n🔑 Access Token (first 50 chars):",
        tokenData.access_token.substring(0, 50) + "..."
      );
      console.log("⏱️  Expires in:", tokenData.expires_in, "seconds");
      console.log("🎫 Token type:", tokenData.token_type);

      // Decode JWT to show some info (without verification)
      if (tokenData.access_token.includes(".")) {
        const parts = tokenData.access_token.split(".");
        if (parts.length >= 2) {
          try {
            const payload = JSON.parse(
              Buffer.from(parts[1], "base64").toString()
            );
            console.log("\n📋 Token Payload (decoded):");
            console.log(
              JSON.stringify(
                {
                  iss: payload.iss,
                  sub: payload.sub,
                  aud: payload.aud,
                  exp: new Date(payload.exp * 1000).toISOString(),
                  iat: new Date(payload.iat * 1000).toISOString(),
                  scope: payload.scope,
                },
                null,
                2
              )
            );
          } catch (e) {
            console.log("⚠️  Could not decode token payload");
          }
        }
      }
    }

    return tokenData;
  } catch (error) {
    console.error("❌ Error retrieving token:", error.message);
    throw error;
  }
}

// Run the script
getToken()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
