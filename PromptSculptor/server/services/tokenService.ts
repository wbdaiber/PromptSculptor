import crypto from 'crypto';

export interface TokenData {
  token: string;
  hashedToken: string;
  expiresAt: Date;
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired?: boolean;
  isUsed?: boolean;
  error?: string;
}

/**
 * Generates a cryptographically secure password reset token
 * @param expiryMinutes - Number of minutes until token expires (default: 30)
 * @returns Object containing raw token, hashed token, and expiry date
 */
export function generateResetToken(expiryMinutes: number = 30): TokenData {
  // Generate 32 bytes of random data for high entropy
  const tokenBytes = crypto.randomBytes(32);
  
  // Convert to URL-safe base64 string
  const token = tokenBytes.toString('base64url');
  
  // Hash the token for secure storage
  const hashedToken = hashToken(token);
  
  // Calculate expiry time
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  console.log(`🔑 Generated password reset token (expires: ${expiresAt.toISOString()})`);
  
  return {
    token,
    hashedToken,
    expiresAt
  };
}

/**
 * Hashes a token using SHA-256 for secure storage
 * @param token - The raw token to hash
 * @returns SHA-256 hash of the token in hex format
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validates a password reset token
 * @param rawToken - The raw token from the user
 * @param storedHashedToken - The hashed token from database
 * @param expiresAt - Token expiration date
 * @param isUsed - Whether token has been used
 * @returns Validation result with detailed status
 */
export function validateToken(
  rawToken: string,
  storedHashedToken: string,
  expiresAt: Date,
  isUsed: boolean = false
): TokenValidationResult {
  // Check if token has already been used
  if (isUsed) {
    console.warn('⚠️  Attempted to use already consumed password reset token');
    return {
      isValid: false,
      isUsed: true,
      error: 'Token has already been used'
    };
  }
  
  // Check if token has expired
  if (new Date() > expiresAt) {
    console.warn('⚠️  Attempted to use expired password reset token');
    return {
      isValid: false,
      isExpired: true,
      error: 'Token has expired'
    };
  }
  
  // Hash the provided token and compare with stored hash
  const providedTokenHash = hashToken(rawToken);
  
  if (providedTokenHash !== storedHashedToken) {
    console.warn('⚠️  Invalid password reset token provided');
    return {
      isValid: false,
      error: 'Invalid token'
    };
  }
  
  console.log('✅ Password reset token validated successfully');
  return {
    isValid: true
  };
}

/**
 * Generates a secure token for testing purposes
 * @returns A test token that can be used for development/testing
 */
export function generateTestToken(): TokenData {
  // For testing, use a shorter expiry time (5 minutes)
  return generateResetToken(5);
}

/**
 * Checks if a token is expired without full validation
 * @param expiresAt - Token expiration date
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Gets time remaining until token expires
 * @param expiresAt - Token expiration date
 * @returns Minutes remaining until expiry (negative if expired)
 */
export function getTokenTimeRemaining(expiresAt: Date): number {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.round(diffMs / 60000); // Convert to minutes
}

/**
 * Sanitizes token for logging (shows only first/last few characters)
 * @param token - The token to sanitize
 * @returns Sanitized token safe for logging
 */
export function sanitizeTokenForLogging(token: string): string {
  if (token.length <= 8) {
    return '***';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Constants for token configuration
 */
export const TOKEN_CONFIG = {
  DEFAULT_EXPIRY_MINUTES: 30,
  TEST_EXPIRY_MINUTES: 5,
  TOKEN_LENGTH_BYTES: 32,
  MIN_TOKEN_LENGTH: 32, // Minimum acceptable token length
  MAX_TOKEN_AGE_HOURS: 24, // Maximum age before cleanup
} as const;

/**
 * Type guard to check if a string could be a valid token
 * @param value - Value to check
 * @returns True if value could be a valid token format
 */
export function isValidTokenFormat(value: string): boolean {
  // Check if it's a base64url string of appropriate length
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  return (
    typeof value === 'string' &&
    value.length >= TOKEN_CONFIG.MIN_TOKEN_LENGTH &&
    base64UrlPattern.test(value)
  );
}