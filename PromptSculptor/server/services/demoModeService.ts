import type { DatabaseStorage } from "../databaseStorage";

/**
 * Context object for demo mode detection
 */
export interface DemoModeContext {
  isAuthenticated: boolean;
  hasApiKeys: boolean;
  availableServices: string[];
  targetModel: string;
  userId?: string;
  dbStorage?: DatabaseStorage;
}

/**
 * Result of demo mode detection
 */
export interface DemoModeResult {
  isDemoMode: boolean;
  reason?: 'unauthenticated' | 'no_api_keys' | 'missing_target_model';
  message?: string;
  callToAction?: string;
}

/**
 * Unified Demo Mode Service
 * 
 * Provides centralized demo mode detection logic to eliminate
 * inconsistencies between client and server implementations.
 * 
 * This service consolidates the scattered demo mode logic from:
 * - server/routes.ts (lines 299-353)
 * - server/services/enhancedDemoMode.ts (lines 316-352)
 * - client-side demo detection components
 */
export class DemoModeService {
  
  /**
   * Determines if the current request should use demo mode
   * 
   * @param context - The demo mode context containing user state
   * @returns boolean indicating if demo mode should be used
   */
  static isDemoMode(context: DemoModeContext): boolean {
    // User is not authenticated - use demo mode
    if (!context.isAuthenticated) {
      return true;
    }

    // User has no API keys at all - use demo mode
    if (!context.hasApiKeys) {
      return true;
    }

    // User doesn't have the specific API key for target model - use demo mode
    if (!context.availableServices.includes(context.targetModel)) {
      return true;
    }

    // All conditions met for AI-powered generation
    return false;
  }

  /**
   * Gets comprehensive demo mode detection result with context
   * 
   * @param context - The demo mode context containing user state
   * @returns DemoModeResult with detection outcome and user guidance
   */
  static getDemoModeResult(context: DemoModeContext): DemoModeResult {
    if (!context.isAuthenticated) {
      return {
        isDemoMode: true,
        reason: 'unauthenticated',
        message: "🎯 This is a demo prompt showcasing PromptSculptor's capabilities. Sign up to save your prompts and unlock AI-powered generation!",
        callToAction: "Create free account to add your API keys and generate personalized prompts"
      };
    }

    if (!context.hasApiKeys) {
      return {
        isDemoMode: true,
        reason: 'no_api_keys',
        message: "📝 Demo mode: Add your API keys to unlock AI-powered prompt generation with personalized results!",
        callToAction: "Add API keys in Settings → API Keys to get started"
      };
    }

    if (!context.availableServices.includes(context.targetModel)) {
      const modelNames = {
        'gpt': 'OpenAI',
        'claude': 'Anthropic Claude', 
        'gemini': 'Google Gemini'
      };
      
      const modelName = modelNames[context.targetModel as keyof typeof modelNames] || context.targetModel;
      
      return {
        isDemoMode: true,
        reason: 'missing_target_model',
        message: `🔧 Demo mode: You have ${context.availableServices.join(', ')} configured. Add ${modelName} for this specific model.`,
        callToAction: `Add ${modelName} API key to use this model, or switch to an available model`
      };
    }

    // All conditions met for AI generation
    return {
      isDemoMode: false
    };
  }

  /**
   * Creates a DemoModeContext from Express request object
   * 
   * @param req - Express request object with user session and API key data
   * @returns Promise resolving to DemoModeContext
   */
  static async getDemoModeContext(req: any, targetModel: string): Promise<DemoModeContext> {
    const isAuthenticated = !!req.user || !!req.userId;
    let hasApiKeys = false;
    let availableServices: string[] = [];

    try {
      if (isAuthenticated && req.userId) {
        // Import here to avoid circular dependencies
        const { DatabaseStorage } = await import('../databaseStorage');
        
        const dbStorage = new DatabaseStorage(req.userId);
        const userApiKeys = await dbStorage.getUserApiKeys(req.userId);
        
        if (userApiKeys && userApiKeys.length > 0) {
          hasApiKeys = true;
          availableServices = userApiKeys.map((key: any) => key.service);
        }

        return {
          isAuthenticated,
          hasApiKeys,
          availableServices,
          targetModel,
          userId: req.userId,
          dbStorage
        };
      }
    } catch (error) {
      console.error('Error building demo mode context:', error);
      // Fall through to unauthenticated context
    }

    // Unauthenticated or error case
    return {
      isAuthenticated: false,
      hasApiKeys: false,
      availableServices: [],
      targetModel
    };
  }

  /**
   * Validates demo mode context for consistency
   * 
   * @param context - The demo mode context to validate
   * @returns boolean indicating if context is valid
   */
  static validateContext(context: DemoModeContext): boolean {
    // Basic validation
    if (typeof context.isAuthenticated !== 'boolean') return false;
    if (typeof context.hasApiKeys !== 'boolean') return false;
    if (!Array.isArray(context.availableServices)) return false;
    if (typeof context.targetModel !== 'string') return false;

    // Logical validation
    if (!context.isAuthenticated && (context.hasApiKeys || context.availableServices.length > 0)) {
      console.warn('Invalid demo mode context: unauthenticated user has API keys');
      return false;
    }

    if (context.hasApiKeys && context.availableServices.length === 0) {
      console.warn('Invalid demo mode context: hasApiKeys=true but no availableServices');
      return false;
    }

    return true;
  }

  /**
   * Gets fallback demo mode context for error scenarios
   * 
   * @param targetModel - The target model for generation
   * @returns Safe fallback DemoModeContext
   */
  static getFallbackContext(targetModel: string): DemoModeContext {
    return {
      isAuthenticated: false,
      hasApiKeys: false,
      availableServices: [],
      targetModel
    };
  }
}