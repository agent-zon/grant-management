# Java Implementation Example

**Source**: User-provided example  
**Date**: 2025-01-27

This document contains the Java implementation example provided as reference for the evaluation service implementation.

## Java Service Implementation

```java
package com.mcp.grantmanagement.service.authzen;

import com.mcp.grantmanagement.dto.authzen.AuthorizationDecision;
import com.mcp.grantmanagement.dto.authzen.AuthorizationRequest;
import com.mcp.grantmanagement.dto.authzen.AuthorizationResponse;
import com.mcp.grantmanagement.service.grant.GrantManagementService;
import org.springframework.stereotype.Service;

@Service
public class AuthZenService {

  private final GrantManagementService grantManagementService;

  public AuthZenService(GrantManagementService grantManagementService) {
    this.grantManagementService = grantManagementService;
  }

  public AuthorizationResponse authorize(AuthorizationRequest request) {
    // Parse resource URI to extract server location and resource type
    String resourceUri = request.getResource();
    String serverLocation = extractServerLocation(resourceUri);
    String resourceType = extractResourceType(resourceUri);

    // Standards-compliant authorization evaluation using resource URI
    java.util.Optional<com.mcp.grantmanagement.domain.grant.Grant> authorizingGrant;
    if (request.getAgenticContext() != null) {
      // Use agentic context for authorization evaluation with wildcard matching
      authorizingGrant =
          grantManagementService.findAuthorizingGrant(
              request.getClientId(),
              request.getSubject(),
              serverLocation,
              request.getAction(),
              resourceType,
              request.getAgenticContext());
    } else {
      // Standard authorization without agentic context
      authorizingGrant =
          grantManagementService.findAuthorizingGrant(
              request.getClientId(),
              request.getSubject(),
              serverLocation,
              request.getAction(),
              resourceType);
    }

    if (authorizingGrant.isPresent()) {
      String contextInfo =
          request.getAgenticContext() != null
              ? " with agentic context (runtime: "
                  + request.getAgenticContext().getAgentRuntime()
                  + ")"
              : "";
      return new AuthorizationResponse(
          AuthorizationDecision.PERMIT,
          "Access granted based on valid authorization details for resource: "
              + resourceUri
              + contextInfo,
          authorizingGrant.get().getGrantId());
    } else {
      return new AuthorizationResponse(
          AuthorizationDecision.DENY,
          "No valid authorization found for the requested access on resource: " + resourceUri);
    }
  }

  /**
   * Extracts the server location from a resource URI. Examples: 
   * - "https://mcp.example.com/tools" -> "https://mcp.example.com" 
   * - "https://api.example.com/v1/resources" -> "https://api.example.com"
   */
  private String extractServerLocation(String resourceUri) {
    try {
      java.net.URI uri = java.net.URI.create(resourceUri);
      return uri.getScheme() + "://" + uri.getAuthority();
    } catch (Exception e) {
      // If not a valid URI, treat the whole string as server location
      return resourceUri;
    }
  }

  /**
   * Extracts the resource type from a resource URI. Examples: 
   * - "https://mcp.example.com/tools" -> "tools" 
   * - "https://api.example.com/v1/resources" -> "resources" 
   * - "tools" -> "tools" (fallback for non-URI resources)
   */
  private String extractResourceType(String resourceUri) {
    try {
      java.net.URI uri = java.net.URI.create(resourceUri);
      String path = uri.getPath();
      if (path != null && !path.isEmpty()) {
        // Remove leading slash and get the first path segment
        String[] segments = path.substring(1).split("/");
        if (segments.length > 0 && !segments[0].isEmpty()) {
          return segments[segments.length - 1]; // Use last segment as resource type
        }
      }
      // If no path, fallback to "default"
      return "default";
    } catch (Exception e) {
      // If not a valid URI, treat the whole string as resource type
      return resourceUri;
    }
  }
}
```

## Key Patterns

1. **Resource URI Parsing**: Extract server location and resource type from URI
2. **Grant Lookup**: Use grantManagementService.findAuthorizingGrant() with client_id, subject, server location, action, and resource type
3. **Agentic Context Support**: Optional agentic context for wildcard matching
4. **Response Format**: Return PERMIT with grant_id or DENY with reason

## Notes

- This Java example uses a service method `findAuthorizingGrant()` that we'll implement as direct authorization_details query in TypeScript
- The resource URI parsing logic should be replicated in the TypeScript implementation
- Agentic context support is optional but should be considered for future enhancement

