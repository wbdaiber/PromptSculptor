import type { Express } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./storage";
import { generateStructuredPrompt, type UserContext } from "./services/promptGenerator";
import { DatabaseStorage } from "./databaseStorage";
import { generatePromptRequestSchema, insertPromptSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireApiKey, optionalApiKey, getAuthStatus } from "./middleware/basicAuth";
import { aiLimiter, modificationLimiter } from "./middleware/rateLimiter";
import { sanitizePromptRequest, sanitizeTitle, sanitizeOutput } from "./utils/sanitizer";
import { setupSession, extractUserId, requireAuth, optionalAuth } from "./middleware/session";
import authRoutes from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session management and passport authentication
  setupSession(app);
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Health check and auth status
  app.get("/api/health", (req, res) => {
    const authStatus = getAuthStatus();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      authentication: authStatus
    });
  });
  
  // Get all templates - templates are global, no user context needed
  app.get("/api/templates", async (_req, res) => {
    try {
      const globalStorage = createStorage(); // No userId for templates
      const templates = await globalStorage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get template by ID
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const globalStorage = createStorage(); // No userId for templates
      const template = await globalStorage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
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
          qualityScore: Math.min(Math.max(result.qualityScore || 0, 0), 100), // Clamp quality score
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
      const userStorage = createStorage(req.userId);
      const prompts = await userStorage.getRecentPrompts(limit);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent prompts" });
    }
  });

  // Get all prompts - user-specific with optional authentication
  app.get("/api/prompts", extractUserId, async (req, res) => {
    try {
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
    const isSessionAuth = req.user;
    
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
            qualityScore: updateFields.qualityScore ? Math.min(Math.max(updateFields.qualityScore, 0), 100) : updateFields.qualityScore,
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
        qualityScore: updateFields.qualityScore ? Math.min(Math.max(updateFields.qualityScore, 0), 100) : updateFields.qualityScore,
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
    const isSessionAuth = req.user;
    
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
