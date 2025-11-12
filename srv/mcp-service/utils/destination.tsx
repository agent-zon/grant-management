import cds from "@sap/cds";
import {
  assertHttpDestination,
  Destination,
  getDestinationFromServiceBinding,
  HttpDestination,
  isHttpDestination,
} from "@sap-cloud-sdk/connectivity";
import { SecurityContext } from "@sap/xssec";
import {
  IdentityService,
  IdentityServiceToken,
} from "@sap/xssec/types/context/IdentityServiceSecurityContext";
import { env } from "process";

function defaultDestination(): HttpDestination {
  return {
    url:
      env.DEFAULT_SERVER ||
      "https://aiam-mcps-everything.cfapps.eu12.hana.ondemand.com",
  };
}
/**
 * Get destination URL from various sources
 * Supports CDS destinations, VCAP_SERVICES, and environment variables
 */
export async function getDestination(
  destinationName: string,
  auth?: SecurityContext<IdentityService, IdentityServiceToken>
): Promise<HttpDestination> {
  try {
    const jwt = auth?.getAppToken();
    // Try to get destination from CDS environment
    const dest = await getDestinationFromServiceBinding({
      destinationName,
      jwt: jwt,
    });
    assertHttpDestination(dest);

    return dest;
    // Try to get from VCAP_SERVICES (service bindings)
  } catch (error) {
    console.error(
      `[McpProxy] Destination '${destinationName}' not found, using default server`
    );
    return defaultDestination();
  }
}
