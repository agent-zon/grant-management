import { Request, Response, NextFunction } from 'express';
import { getDecodedToken } from '../utils/token-utils.js';

/**
 * Authentication Middleware
 * 
 * Validates JWT tokens from Authorization header and attaches
 * decoded token data to the request object.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for health check endpoint
  if (req.path === '/health') {
    return next();
  }

  const tokenData = getDecodedToken(req);
  
  if (!tokenData) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid JWT token required in Authorization header'
    });
  }

  // Token is valid, attach to request and continue
  (req as any).tokenData = tokenData;
  next();
}
