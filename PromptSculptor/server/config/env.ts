import { z } from 'zod';

// Secure environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('5001'), // Using 5001 to avoid macOS AirPlay conflict on port 5000
  DATABASE_URL: z.string().min(1),
  
  // Authentication & Security Keys - validate format and length
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)').regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be valid hex string'),
  
  // API Keys (Optional - Users provide their own keys)
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_API_KEY: z.string().min(1).optional(), // Legacy support
  GEMINI_API_KEY: z.string().min(1).optional(),
  
  // Security keys (deprecated - using Google OAuth for admin auth)
  ADMIN_API_KEY: z.string().min(32).optional(),
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  ADMIN_ALLOWED_EMAILS: z.string().optional(),
  
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000'), // 15 minutes in milliseconds
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100'), // Max requests per window
  
  // Optional security configuration
  CORS_ORIGINS: z.string().default('http://localhost:5001,http://localhost:3000'),
  
  // Email configuration (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required for email functionality').optional(),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address').optional(),
  APP_URL: z.string().url('APP_URL must be a valid URL').default('http://localhost:5001'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables on server startup
 * Exits process if critical configuration is missing
 */
export function validateEnv(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    
    // Additional validation for production environments
    if (env.NODE_ENV === 'production') {
      // Note: ADMIN_API_KEY is deprecated in favor of Google OAuth
      // AI API keys are not required - users provide their own keys
      // Templates work without any AI service keys
      
      // Validate security configuration strength in production
      if (env.SESSION_SECRET.length < 64) {
        console.warn('⚠️  SESSION_SECRET should be at least 64 characters in production');
      }
      
      // Validate email configuration in production
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
        console.warn('⚠️  Email functionality (password reset) requires RESEND_API_KEY and EMAIL_FROM in production');
      }
    }
    
    // Log successful validation (without exposing sensitive values)
    console.log('✅ Environment validation passed');
    if (env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - some security features relaxed');
    }
    
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n💡 Check your .env file and ensure all required variables are set');
    process.exit(1);
  }
}

// Export validated config
export const config = validateEnv();