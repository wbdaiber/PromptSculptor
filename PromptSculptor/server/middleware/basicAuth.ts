import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

/**
 * Basic API Key Authentication Middleware
 * Prevents unauthorized access to sensitive endpoints
 */

// Secure set of valid API keys
const getValidAPIKeys = (): Set<string> => {
  const keys = new Set<string>();
  
  if (config.ADMIN_API_KEY) {
    keys.add(config.ADMIN_API_KEY);
  }
  
  // In development, allow a simple default key for testing
  if (config.NODE_ENV === 'development') {
    keys.add('dev-api-key-123');
  }
  
  return keys;
};

/**
 * Middleware to require valid API key for sensitive endpoints
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const validKeys = getValidAPIKeys();
  
  // Skip API key requirement in development if no keys are configured
  if (config.NODE_ENV === 'development' && validKeys.size === 0) {
    console.warn('⚠️  No API keys configured - allowing access in development mode');
    return next();
  }
  
  // Extract API key from headers
  const apiKey = req.headers['x-api-key'] as string || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.headers['api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide a valid API key in the X-API-Key header'
    });
  }
  
  if (!validKeys.has(apiKey)) {
    // Log invalid authentication attempts
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.warn(`🔒 Invalid API key attempt from IP: ${clientIP} on ${req.method} ${req.path}`);
    
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }
  
  // Log successful authentication in development
  if (config.NODE_ENV === 'development') {
    console.log(`✅ Valid API key authentication for ${req.method} ${req.path}`);
  }
  
  next();
}

/**
 * Optional API key middleware (doesn't block if no key provided)
 * Useful for endpoints that benefit from authentication but don't require it
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const validKeys = getValidAPIKeys();
  const apiKey = req.headers['x-api-key'] as string || 
                 req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey && validKeys.has(apiKey)) {
    // Mark request as authenticated
    (req as any).authenticated = true;
  }
  
  next();
}

/**
 * Health check for API key configuration
 */
export function getAuthStatus() {
  const validKeys = getValidAPIKeys();
  
  return {
    hasApiKeys: validKeys.size > 0,
    isDevelopment: config.NODE_ENV === 'development',
    authRequired: config.NODE_ENV === 'production' || validKeys.size > 0
  };
}