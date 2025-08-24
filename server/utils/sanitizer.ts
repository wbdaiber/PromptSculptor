import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOMPurify instance with jsdom for server-side usage
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes dangerous HTML and JavaScript while preserving safe text
 */
export function sanitizeInput(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // First, enforce length limit to prevent resource exhaustion
  const truncated = input.slice(0, maxLength);
  
  // Remove any HTML tags and dangerous content
  const sanitized = purify.sanitize(truncated, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    USE_PROFILES: { html: false, svg: false, mathMl: false }
  });
  
  // Additional sanitization for common attack patterns
  return sanitized
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove any script tags that might have escaped
    .trim();
}

/**
 * Sanitizes output that might be displayed as HTML
 * Allows basic formatting but removes dangerous content
 */
export function sanitizeOutput(output: string, maxLength: number = 50000): string {
  if (!output || typeof output !== 'string') {
    return '';
  }
  
  const truncated = output.slice(0, maxLength);
  
  // Allow basic formatting tags but remove dangerous content
  return purify.sanitize(truncated, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    USE_PROFILES: { html: true, svg: false, mathMl: false }
  });
}

/**
 * Validates and sanitizes a title string
 */
export function sanitizeTitle(title: string, maxLength: number = 255): string {
  if (!title || typeof title !== 'string') {
    return 'Untitled';
  }
  
  // Remove all HTML and limit length
  return sanitizeInput(title, maxLength);
}

/**
 * Batch sanitization for request objects
 */
export function sanitizePromptRequest(request: any) {
  return {
    ...request,
    naturalLanguageInput: sanitizeInput(request.naturalLanguageInput, 5000),
    // Sanitize any other string fields that might contain user input
    ...(request.customInstructions && {
      customInstructions: sanitizeInput(request.customInstructions, 2000)
    }),
    ...(request.context && {
      context: sanitizeInput(request.context, 10000)
    })
  };
}