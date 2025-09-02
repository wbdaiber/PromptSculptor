import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Custom key generator for Vercel deployment
const getClientIdentifier = (req: Request): string => {
  // In production (Vercel), use the forwarded IP from headers
  // Vercel provides the client IP in x-forwarded-for header
  if (process.env.NODE_ENV === 'production') {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for may contain multiple IPs, get the first one (original client)
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }
  }
  // Fallback to req.ip for local development
  return req.ip || 'unknown';
};

// Strict rate limiter for AI endpoints (expensive operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 AI requests per minute
  message: { error: 'Too many AI requests. Please wait before trying again.' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit headers
  skipSuccessfulRequests: false, // Count all requests
  keyGenerator: getClientIdentifier, // Use custom key generator for Vercel
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for AI endpoint from IP: ${getClientIdentifier(req)}`);
    res.status(429).json({ 
      error: 'Too many AI requests. Please wait before trying again.',
      retryAfter: 60 // seconds
    });
  }
});

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier, // Use custom key generator for Vercel
});

// Auth endpoints limiter (stricter for security)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 auth attempts per 15 minutes
  message: { error: 'Too many authentication attempts. Please try again later.' },
  skipSuccessfulRequests: true, // Only count failed attempts
  keyGenerator: getClientIdentifier, // Use custom key generator for Vercel
  handler: (req, res) => {
    // Log potential brute force attempts
    console.error(`Potential brute force from IP: ${getClientIdentifier(req)} on ${req.path}`);
    res.status(429).json({ 
      error: 'Too many authentication attempts. Account temporarily locked.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

// Strict limiter for data modification endpoints
export const modificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 modifications per 5 minutes
  message: { error: 'Too many modification requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier, // Use custom key generator for Vercel
});

// Email-specific limiter for password reset requests (prevent abuse)
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Only 3 password reset requests per 15 minutes
  message: { error: 'Too many password reset requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests to prevent spam
  keyGenerator: getClientIdentifier, // Use custom key generator for Vercel
  handler: (req, res) => {
    console.warn(`Password reset rate limit exceeded from IP: ${getClientIdentifier(req)}`);
    res.status(429).json({
      error: 'Too many password reset requests. Please wait before trying again.',
      message: 'For security reasons, you can only request password resets 3 times per 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});