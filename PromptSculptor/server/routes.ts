import type { Express } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./storage.js";
import { generateStructuredPrompt, type UserContext } from "./services/promptGenerator.js";
import { DatabaseStorage } from "./databaseStorage.js";
import { generatePromptRequestSchema, insertPromptSchema, insertTemplateSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireApiKey, getAuthStatus } from "./middleware/basicAuth.js";
import { aiLimiter, modificationLimiter } from "./middleware/rateLimiter.js";
import { sanitizePromptRequest, sanitizeTitle, sanitizeOutput } from "./utils/sanitizer.js";
import { setupSession, extractUserId } from "./middleware/session.js";
import { validateUserContext, validateAuthenticatedContext } from "./middleware/contextValidation.js";
import authRoutes from "./routes/auth.js";
import monitoringRoutes from "./routes/monitoring.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import { cacheInvalidationService } from "./services/cacheInvalidationService.js";
import { DemoModeService } from "./services/demoModeService.js";
import { templateManagementService } from "./services/templateManagementService.js";

// Helper function for template creation
async function handleTemplateCreation(req: any, res: any) {
  try {
    // Validate and sanitize the template data
    const templateData = insertTemplateSchema.parse({
      ...req.body,
      name: sanitizeTitle(req.body.name || 'Custom Template', 100),
      description: sanitizeOutput(req.body.description || '', 500),
      sampleInput: sanitizeOutput(req.body.sampleInput || '', 7500),
      userId: req.userId || null,
      isDefault: false, // User-created templates are never default
    });

    const userStorage = createStorage(req.userId);
    const newTemplate = await userStorage.createTemplate(templateData);
    
    // Invalidate template caches
    if (req.userId) {
      cacheInvalidationService.onTemplateChanged(req.userId);
    }
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('[Template Creation Error]:', error);
    console.error('[Template Creation Error - Stack]:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Template Creation Error - Request Body]:', req.body);
    console.error('[Template Creation Error - User ID]:', req.userId);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid template data",
        details: error.errors
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Template Creation Error - Message]:', errorMessage);
    
    // Return more detailed error in development/debugging
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    res.status(500).json({ 
      message: "Failed to create template",
      error: isDevelopment ? errorMessage : undefined,
      details: isDevelopment ? {
        dbConfigured: !!process.env.DATABASE_URL,
        userId: req.userId,
        hasAuth: !!(req.user || req.userId)
      } : undefined
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session management and passport authentication
  setupSession(app);
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Admin OAuth authentication routes
  app.use('/api/admin/auth', adminAuthRoutes);
  
  // Monitoring routes (admin endpoints)
  app.use('/api/monitoring', monitoringRoutes);
  
  // Health check and auth status
  app.get("/api/health", async (req, res) => {
    const authStatus = getAuthStatus();
    
    // Test database connection
    let dbStatus = "unknown";
    let dbError = null;
    try {
      // Try to get default templates which tests the database connection
      const templates = await templateManagementService.getDefaultTemplates();
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "error";
      dbError = error instanceof Error ? error.message : "Unknown database error";
      console.error("[Health Check] Database connection error:", error);
    }
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      authentication: authStatus,
      database: {
        status: dbStatus,
        error: dbError,
        url_configured: !!process.env.DATABASE_URL
      }
    });
  });
  
  // Get default templates - PUBLIC endpoint for guest users
  app.get("/api/templates/default", async (_req, res) => {
    try {
      const defaultTemplates = await templateManagementService.getDefaultTemplates();
      res.json(defaultTemplates);
    } catch (error) {
      console.error('Error fetching default templates:', error);
      res.status(500).json({ message: "Failed to fetch default templates" });
    }
  });
  
  // Get all templates - combines default + user templates (auth optional)
  app.get("/api/templates", extractUserId, async (req, res) => {
    try {
      // Set no-cache headers to prevent browser caching of user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      // Always return default templates, add user templates if authenticated
      const defaultTemplates = await templateManagementService.getDefaultTemplates();
      
      if (req.userId) {
        // Authenticated user - return defaults + user templates
        const userTemplates = await templateManagementService.getUserTemplates(req.userId);
        res.json([...defaultTemplates, ...userTemplates]);
      } else {
        // Guest user - return only defaults
        res.json(defaultTemplates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get template by ID - filtered by user context
  app.get("/api/templates/:id", extractUserId, validateUserContext, async (req, res) => {
    try {
      const userStorage = createStorage(req.userId); // Pass user context for proper filtering
      const template = await userStorage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found or access denied" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Create template - PROTECTED: Requires authentication
  app.post("/api/templates", modificationLimiter, extractUserId, async (req, res) => {
    // Allow both API key authentication and session-based authentication
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user && req.userId; // Check both req.user and req.userId
    
    if (!isApiKeyAuth && !isSessionAuth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to create templates'
      });
    }
    
    // Apply context validation for session auth, skip for API key auth
    if (isSessionAuth && !isApiKeyAuth) {
      return validateAuthenticatedContext(req, res, async () => {
        await handleTemplateCreation(req, res);
      });
    }
    
    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, () => handleTemplateCreation(req, res));
    }
    
    // For session-based authentication, proceed directly
    await handleTemplateCreation(req, res);
  });

  // Update template - PROTECTED: Requires authentication and ownership
  app.put("/api/templates/:id", modificationLimiter, extractUserId, validateAuthenticatedContext, async (req, res) => {
    // Allow both API key authentication and session-based authentication
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user && req.userId; // Check both req.user and req.userId
    
    if (!isApiKeyAuth && !isSessionAuth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to update templates'
      });
    }

    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, async () => {
        try {
          // Validate and sanitize the template data
          const templateData = insertTemplateSchema.partial().parse({
            ...req.body,
            name: req.body.name ? sanitizeTitle(req.body.name, 100) : undefined,
            description: req.body.description ? sanitizeOutput(req.body.description, 500) : undefined,
            sampleInput: req.body.sampleInput ? sanitizeOutput(req.body.sampleInput, 7500) : undefined,
          });

          const userStorage = createStorage(req.userId);
          const updatedTemplate = await userStorage.updateTemplate(req.params.id, templateData);
          if (!updatedTemplate) {
            return res.status(404).json({ message: "Template not found or cannot be updated" });
          }
          
          // Invalidate template caches
          if (req.userId) {
            cacheInvalidationService.onTemplateChanged(req.userId);
          }
          
          res.json(updatedTemplate);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              error: "Invalid template data",
              details: error.errors
            });
          }
          res.status(500).json({ message: "Failed to update template" });
        }
      });
    }

    // For session-based authentication, proceed directly
    try {
      // Validate and sanitize the template data
      const templateData = insertTemplateSchema.partial().parse({
        ...req.body,
        name: req.body.name ? sanitizeTitle(req.body.name, 100) : undefined,
        description: req.body.description ? sanitizeOutput(req.body.description, 500) : undefined,
        sampleInput: req.body.sampleInput ? sanitizeOutput(req.body.sampleInput, 7500) : undefined,
      });

      const userStorage = createStorage(req.userId);
      const updatedTemplate = await userStorage.updateTemplate(req.params.id, templateData);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found or cannot be updated" });
      }
      
      // Invalidate template caches
      if (req.userId) {
        cacheInvalidationService.onTemplateChanged(req.userId);
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid template data",
          details: error.errors
        });
      }
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Delete template - PROTECTED: Requires authentication and ownership
  app.delete("/api/templates/:id", modificationLimiter, extractUserId, validateAuthenticatedContext, async (req, res) => {
    // Allow both API key authentication and session-based authentication
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user && req.userId; // Check both req.user and req.userId
    
    if (!isApiKeyAuth && !isSessionAuth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to delete templates'
      });
    }

    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, async () => {
        try {
          const userStorage = createStorage(req.userId);
          const deleted = await userStorage.deleteTemplate(req.params.id);
          if (!deleted) {
            return res.status(404).json({ message: "Template not found or cannot be deleted" });
          }
          
          // Invalidate template caches
          if (req.userId) {
            cacheInvalidationService.onTemplateChanged(req.userId);
          }
          
          res.json({ message: "Template deleted successfully" });
        } catch (error) {
          res.status(500).json({ message: "Failed to delete template" });
        }
      });
    }

    // For session-based authentication, proceed directly
    try {
      const userStorage = createStorage(req.userId);
      const deleted = await userStorage.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found or cannot be deleted" });
      }
      
      // Invalidate template caches
      if (req.userId) {
        cacheInvalidationService.onTemplateChanged(req.userId);
      }
      
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Helper function for prompt generation logic
  async function generatePromptHandler(req: any, res: any) {
    try {
      // First validate the request structure
      const rawRequest = generatePromptRequestSchema.parse(req.body);
      
      // Sanitize user input to prevent XSS and injection attacks
      const sanitizedRequest = sanitizePromptRequest(rawRequest);
      
      // Create user context for the prompt generator
      const userContext: UserContext = {
        userId: req.userId,
        isAuthenticated: !!req.user || !!req.userId,
        dbStorage: req.userId ? new DatabaseStorage(req.userId) : undefined
      };
      
      // Generate prompt with sanitized input and user context
      const result = await generateStructuredPrompt(sanitizedRequest, userContext);
      
      // Handle demo mode vs regular mode persistence
      let savedPrompt = null;
      let response: any;
      
      if (!result.isDemoMode && req.userId) {
        // Regular mode: save to database
        const userStorage = createStorage(req.userId);
        
        // Sanitize and validate the output before saving
        const promptData = insertPromptSchema.parse({
          title: sanitizeTitle(result.title || 'Generated Prompt', 255),
          naturalLanguageInput: sanitizedRequest.naturalLanguageInput,
          generatedPrompt: sanitizeOutput(result.generatedPrompt || '', 50000),
          templateType: sanitizedRequest.templateType,
          targetModel: sanitizedRequest.targetModel,
          complexityLevel: sanitizedRequest.complexityLevel,
          includeExamples: sanitizedRequest.includeExamples,
          useXMLTags: sanitizedRequest.useXMLTags,
          includeConstraints: sanitizedRequest.includeConstraints,
          wordCount: Math.min(Math.max(result.wordCount || 0, 0), 50000), // Clamp word count
          userId: req.userId || null, // Associate with user if authenticated
        });

        savedPrompt = await userStorage.createPrompt(promptData);
        
        // Invalidate caches after prompt creation
        if (savedPrompt && savedPrompt.id) {
          cacheInvalidationService.onPromptCreated(req.userId, savedPrompt.id);
        }
        
        response = {
          ...result,
          promptId: savedPrompt.id
        };
      } else {
        // Demo mode or unauthenticated: don't save to database
        response = {
          ...result,
          promptId: null,
          demoInfo: {
            isDemoMode: result.isDemoMode,
            message: result.demoMessage,
            callToAction: result.callToAction
          }
        };
      }
      
      res.json(response);
    } catch (error) {
      // SECURE: Log errors safely with tracking ID
      const errorId = Date.now().toString(36);
      console.error(`Prompt generation error ${errorId}:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          errorId: process.env.NODE_ENV === 'development' ? errorId : undefined
        });
      }
      
      res.status(500).json({ 
        error: "Failed to generate prompt",
        errorId: process.env.NODE_ENV === 'development' ? errorId : undefined
      });
    }
  }

  // Generate structured prompt - ALLOWS unauthenticated demo mode, with rate limiting
  app.post("/api/prompts/generate", aiLimiter, extractUserId, validateUserContext, async (req, res) => {
    // Allow API key authentication, session-based authentication, OR unauthenticated demo mode
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user;
    
    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, () => generatePromptHandler(req, res));
    }
    
    // For session-based authentication or mixed auth, proceed directly
    return generatePromptHandler(req, res);
  });

  // Get recent prompts - user-specific with optional authentication
  app.get("/api/prompts/recent", extractUserId, validateAuthenticatedContext, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Set no-cache headers to prevent browser caching of user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      // Only return prompts if user is authenticated
      if (!req.userId) {
        return res.json([]); // Return empty array for unauthenticated users
      }
      
      const userStorage = createStorage(req.userId);
      const prompts = await userStorage.getRecentPrompts(limit);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent prompts" });
    }
  });

  // Get favorite prompts - PROTECTED: Requires authentication
  app.get("/api/prompts/favorites", extractUserId, validateAuthenticatedContext, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Set no-cache headers to prevent browser caching of user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      // Only return prompts if user is authenticated
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to view favorite prompts'
        });
      }
      
      const userStorage = createStorage(req.userId);
      const prompts = await userStorage.getFavoritePrompts(limit);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite prompts" });
    }
  });

  // Toggle prompt favorite status - PROTECTED: Requires authentication
  app.patch("/api/prompts/:id/favorite", modificationLimiter, extractUserId, validateAuthenticatedContext, async (req, res) => {
    try {
      // Check authentication
      const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
      const isSessionAuth = req.user && req.userId;
      
      if (!isApiKeyAuth && !isSessionAuth) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to manage favorite prompts'
        });
      }
      
      const { isFavorite } = req.body;
      
      if (typeof isFavorite !== 'boolean') {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'isFavorite must be a boolean value'
        });
      }
      
      const userStorage = createStorage(req.userId);
      const updatedPrompt = await userStorage.togglePromptFavorite(req.params.id, isFavorite);
      
      if (!updatedPrompt) {
        return res.status(404).json({ message: "Prompt not found or access denied" });
      }
      
      // Invalidate caches after favorite status change
      if (req.userId) {
        cacheInvalidationService.onPromptUpdated(req.userId, req.params.id, { isFavorite });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error('Favorite toggle error:', error);
      res.status(500).json({ 
        message: "Failed to update favorite status",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Get all prompts - user-specific with optional authentication
  app.get("/api/prompts", extractUserId, validateUserContext, async (req, res) => {
    try {
      // Set no-cache headers to prevent browser caching of user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      // Only return prompts if user is authenticated
      if (!req.userId) {
        return res.json([]); // Return empty array for unauthenticated users
      }
      
      const userStorage = createStorage(req.userId);
      const prompts = await userStorage.getPrompts();
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  // Get prompt by ID - user-specific with optional authentication
  app.get("/api/prompts/:id", extractUserId, validateUserContext, async (req, res) => {
    try {
      const userStorage = createStorage(req.userId);
      const prompt = await userStorage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  // Update prompt - PROTECTED: Requires authentication (API key OR session) for data modification
  app.put("/api/prompts/:id", modificationLimiter, extractUserId, validateAuthenticatedContext, async (req, res) => {
    
    // Allow both API key authentication and session-based authentication
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user && req.userId; // Check both req.user and req.userId
    
    if (!isApiKeyAuth && !isSessionAuth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide either an API key or log in to update prompts'
      });
    }
    
    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, async () => {
        try {
          // Validate and sanitize the update request
          const updateFields = insertPromptSchema.partial().parse(req.body);
          const sanitizedUpdate = {
            ...updateFields,
            title: updateFields.title ? sanitizeTitle(updateFields.title, 255) : updateFields.title,
            naturalLanguageInput: updateFields.naturalLanguageInput ? sanitizePromptRequest({ naturalLanguageInput: updateFields.naturalLanguageInput } as any).naturalLanguageInput : updateFields.naturalLanguageInput,
            generatedPrompt: updateFields.generatedPrompt ? sanitizeOutput(updateFields.generatedPrompt, 50000) : updateFields.generatedPrompt,
            wordCount: updateFields.wordCount ? Math.min(Math.max(updateFields.wordCount, 0), 50000) : updateFields.wordCount,
          };

          const userStorage = createStorage(req.userId);
          const updated = await userStorage.updatePrompt(req.params.id, sanitizedUpdate);
          if (!updated) {
            return res.status(404).json({ message: "Prompt not found" });
          }
          
          // Invalidate caches after prompt update
          if (req.userId) {
            cacheInvalidationService.onPromptUpdated(req.userId, req.params.id, {});
          }
          
          res.json(updated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              error: "Invalid update data",
              details: error.errors
            });
          }
          res.status(500).json({ message: "Failed to update prompt" });
        }
      });
    }
    
    // For session-based authentication, proceed directly
    try {
      // Validate and sanitize the update request
      const updateFields = insertPromptSchema.partial().parse(req.body);
      const sanitizedUpdate = {
        ...updateFields,
        title: updateFields.title ? sanitizeTitle(updateFields.title, 255) : updateFields.title,
        naturalLanguageInput: updateFields.naturalLanguageInput ? sanitizePromptRequest({ naturalLanguageInput: updateFields.naturalLanguageInput } as any).naturalLanguageInput : updateFields.naturalLanguageInput,
        generatedPrompt: updateFields.generatedPrompt ? sanitizeOutput(updateFields.generatedPrompt, 50000) : updateFields.generatedPrompt,
        wordCount: updateFields.wordCount ? Math.min(Math.max(updateFields.wordCount, 0), 50000) : updateFields.wordCount,
      };

      const userStorage = createStorage(req.userId);
      const updated = await userStorage.updatePrompt(req.params.id, sanitizedUpdate);
      if (!updated) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      // Invalidate caches after prompt update
      if (req.userId) {
        cacheInvalidationService.onPromptUpdated(req.userId, req.params.id, {});
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid update data",
          details: error.errors
        });
      }
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  // Delete prompt - PROTECTED: Requires authentication (API key OR session) for data modification
  app.delete("/api/prompts/:id", modificationLimiter, extractUserId, validateAuthenticatedContext, async (req, res) => {
    // Allow both API key authentication and session-based authentication
    const isApiKeyAuth = req.headers['x-api-key'] || req.headers['authorization'] || req.headers['api-key'];
    const isSessionAuth = req.user && req.userId; // Check both req.user and req.userId
    
    if (!isApiKeyAuth && !isSessionAuth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide either an API key or log in to delete prompts'
      });
    }
    
    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, async () => {
        try {
          const userStorage = createStorage(req.userId);
          const deleted = await userStorage.deletePrompt(req.params.id);
          if (!deleted) {
            return res.status(404).json({ message: "Prompt not found" });
          }
          
          // Invalidate caches after prompt deletion
          if (req.userId) {
            cacheInvalidationService.onPromptDeleted(req.userId, req.params.id);
          }
          
          res.json({ message: "Prompt deleted successfully" });
        } catch (error) {
          res.status(500).json({ message: "Failed to delete prompt" });
        }
      });
    }
    
    // For session-based authentication, proceed directly
    try {
      const userStorage = createStorage(req.userId);
      const deleted = await userStorage.deletePrompt(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      // Invalidate caches after prompt deletion
      if (req.userId) {
        cacheInvalidationService.onPromptDeleted(req.userId, req.params.id);
      }
      
      res.json({ message: "Prompt deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
