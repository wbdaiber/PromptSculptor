import type { Express } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./storage";
import { generateStructuredPrompt, type UserContext } from "./services/promptGenerator";
import { DatabaseStorage } from "./databaseStorage";
import { generatePromptRequestSchema, insertPromptSchema, insertTemplateSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireApiKey, optionalApiKey, getAuthStatus } from "./middleware/basicAuth";
import { aiLimiter, modificationLimiter } from "./middleware/rateLimiter";
import { sanitizePromptRequest, sanitizeTitle, sanitizeOutput } from "./utils/sanitizer";
import { setupSession, extractUserId, requireAuth, optionalAuth } from "./middleware/session";
import authRoutes from "./routes/auth";
import monitoringRoutes from "./routes/monitoring";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session management and passport authentication
  setupSession(app);
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Monitoring routes (admin endpoints)
  app.use('/api/monitoring', monitoringRoutes);
  
  // Health check and auth status
  app.get("/api/health", (req, res) => {
    const authStatus = getAuthStatus();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      authentication: authStatus
    });
  });
  
  // Get all templates - filtered by user context
  app.get("/api/templates", extractUserId, async (req, res) => {
    try {
      // Set no-cache headers to prevent browser caching of user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      const userStorage = createStorage(req.userId); // Pass user context for proper filtering
      const templates = await userStorage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get template by ID - filtered by user context
  app.get("/api/templates/:id", extractUserId, async (req, res) => {
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
    
    // Validate API key if provided (for external API access)
    if (isApiKeyAuth && !isSessionAuth) {
      return requireApiKey(req, res, async () => {
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
          res.status(201).json(newTemplate);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              error: "Invalid template data",
              details: error.errors
            });
          }
          res.status(500).json({ message: "Failed to create template" });
        }
      });
    }
    
    // For session-based authentication, proceed directly
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
      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid template data",
          details: error.errors
        });
      }
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Update template - PROTECTED: Requires authentication and ownership
  app.put("/api/templates/:id", modificationLimiter, extractUserId, async (req, res) => {
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
  app.delete("/api/templates/:id", modificationLimiter, extractUserId, async (req, res) => {
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
  app.post("/api/prompts/generate", aiLimiter, extractUserId, async (req, res) => {
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
  app.get("/api/prompts/recent", extractUserId, async (req, res) => {
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
  app.get("/api/prompts/favorites", extractUserId, async (req, res) => {
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
  app.patch("/api/prompts/:id/favorite", modificationLimiter, extractUserId, async (req, res) => {
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
  app.get("/api/prompts", extractUserId, async (req, res) => {
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
  app.get("/api/prompts/:id", extractUserId, async (req, res) => {
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
  app.put("/api/prompts/:id", modificationLimiter, extractUserId, async (req, res) => {
    
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
  app.delete("/api/prompts/:id", modificationLimiter, extractUserId, async (req, res) => {
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
      res.json({ message: "Prompt deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
