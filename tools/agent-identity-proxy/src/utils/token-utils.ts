import { Request } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Token data containing the JWT string and decoded payload
 */
export interface TokenData {
  jwt: string;
  payload: any;
}

/**
 * Extract and decode JWT from Authorization header
 * 
 * Handles multiple header formats:
 * - 'Authorization' or 'authorization' headers
 * - Array or string header values
 * - 'Bearer' or 'bearer' prefixes
 * 
 * @param req - Express request object
 * @returns Token data with JWT string and decoded payload, or null if not found/invalid
 */
export function getDecodedToken(req: Request): TokenData | null {
  // Get authorization header (case-insensitive)
  const authHeaderValue = req.headers.authorization || req.headers['Authorization'];
  
  if (!authHeaderValue) {
    return null;
  }
  
  // Handle array of headers (use first one)
  const authHeader = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
  
  if (!authHeader) {
    return null;
  }
  
  // Extract token from Bearer prefix (case-insensitive)
  const bearerMatch = authHeader.match(/^bearer\s+(.+)$/i);
  
  if (!bearerMatch) {
    return null;
  }
  
  const token = bearerMatch[1];
  
  try {
    return {
      jwt: token,
      payload: jwt.decode(token)
    };
  } catch (error) {
    console.error('[Token Utils] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Extract grant ID from token payload
 * 
 * Tries multiple common fields: sid (session ID), jti (JWT ID)
 * 
 * @param tokenData - Token data from getDecodedToken
 * @returns Grant ID string or null if not found
 */
export function getGrantIdFromToken(tokenData: TokenData | null): string | null {
  if (!tokenData?.payload) {
    return null;
  }
  
  return tokenData.payload.sid || tokenData.payload.jti || null;
}
