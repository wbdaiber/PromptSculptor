import { type Prompt, type InsertPrompt, type Template, type InsertTemplate } from "../shared/schema.js";
import { randomUUID } from "crypto";
import { DatabaseStorage } from "./databaseStorage.js";
import { TemplateService } from "./services/templateService.js";

export interface IStorage {
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPrompts(): Promise<Prompt[]>;
  getRecentPrompts(limit?: number): Promise<Prompt[]>;
  getFavoritePrompts(limit?: number): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: string): Promise<boolean>;
  togglePromptFavorite(id: string, isFavorite: boolean): Promise<Prompt | undefined>;
  
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplates(): Promise<Template[]>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getUserTemplates(userId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Password reset token methods for cleanup service
  cleanupExpiredTokens?(): Promise<number>;
  invalidateUserTokens?(userId: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private prompts: Map<string, Prompt>;
  private templates: Map<string, Template>;
  private userId?: string;

  constructor(userId?: string) {
    this.prompts = new Map();
    this.templates = new Map();
    this.userId = userId;
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    // Get templates from centralized service
    const templateService = TemplateService.getInstance();
    const defaultTemplates = templateService.getDefaultTemplates();

    defaultTemplates.forEach(template => {
      const id = randomUUID();
      const fullTemplate: Template = { 
        ...template, 
        id,
        slug: template.slug || null,
        userId: null,
        isDefault: true,
        createdAt: new Date()
      };
      this.templates.set(id, fullTemplate);
    });
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async getPrompts(): Promise<Prompt[]> {
    // Only return prompts for authenticated users
    if (!this.userId) {
      return []; // No prompts for anonymous users
    }
    
    return Array.from(this.prompts.values())
      .filter(prompt => prompt.userId === this.userId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    const allPrompts = await this.getPrompts();
    return allPrompts.slice(0, limit);
  }

  async getFavoritePrompts(limit: number = 10): Promise<Prompt[]> {
    // Only return favorite prompts for authenticated users
    if (!this.userId) {
      return []; // No favorites for anonymous users
    }
    
    const allPrompts = Array.from(this.prompts.values())
      .filter(prompt => prompt.userId === this.userId && prompt.isFavorite)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    return limit ? allPrompts.slice(0, limit) : allPrompts;
  }

  async togglePromptFavorite(id: string, isFavorite: boolean): Promise<Prompt | undefined> {
    const prompt = this.prompts.get(id);
    if (!prompt || prompt.userId !== this.userId) {
      return undefined;
    }

    const updated: Prompt = { ...prompt, isFavorite };
    this.prompts.set(id, updated);
    return updated;
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = randomUUID();
    const prompt: Prompt = { 
      id,
      createdAt: new Date(),
      title: insertPrompt.title,
      naturalLanguageInput: insertPrompt.naturalLanguageInput,
      generatedPrompt: insertPrompt.generatedPrompt,
      templateType: insertPrompt.templateType,
      targetModel: insertPrompt.targetModel || 'claude',
      complexityLevel: insertPrompt.complexityLevel || 'detailed',
      includeExamples: insertPrompt.includeExamples ?? true,
      useXMLTags: insertPrompt.useXMLTags ?? true,
      includeConstraints: insertPrompt.includeConstraints ?? false,
      wordCount: insertPrompt.wordCount || 0,
      isFavorite: insertPrompt.isFavorite ?? false,
      userId: insertPrompt.userId || null, // Optional for backward compatibility
    };
    this.prompts.set(id, prompt);
    return prompt;
  }

  async updatePrompt(id: string, updatePrompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const existing = this.prompts.get(id);
    if (!existing) return undefined;

    const updated: Prompt = { ...existing, ...updatePrompt };
    this.prompts.set(id, updated);
    return updated;
  }

  async deletePrompt(id: string): Promise<boolean> {
    return this.prompts.delete(id);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    // Check if template is default or belongs to the user
    if (!this.userId) {
      // Only allow access to default templates for anonymous users
      return template.isDefault ? template : undefined;
    }
    
    // Allow access to default templates or user's own templates
    if (template.isDefault || template.userId === this.userId) {
      return template;
    }
    
    return undefined;
  }

  async getTemplates(): Promise<Template[]> {
    // Return only default system templates when no user context
    if (!this.userId) {
      return Array.from(this.templates.values()).filter(t => t.isDefault);
    }
    
    // Return default templates + user's own templates
    return Array.from(this.templates.values()).filter(t => 
      t.isDefault || t.userId === this.userId
    );
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    // Return only default system templates when no user context
    if (!this.userId) {
      return Array.from(this.templates.values()).filter(template => 
        template.type === type && template.isDefault
      );
    }
    
    // Return default templates + user's own templates of specified type
    return Array.from(this.templates.values()).filter(template => 
      template.type === type && (template.isDefault || template.userId === this.userId)
    );
  }

  async getUserTemplates(userId: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(template => template.userId === userId);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = { 
      ...insertTemplate, 
      id,
      slug: insertTemplate.slug || null,
      createdAt: new Date(),
      isDefault: insertTemplate.isDefault || false,
      userId: insertTemplate.userId || null
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updateTemplate: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;

    // Prevent updating default system templates
    if (existing.isDefault) return undefined;

    const updated: Template = { ...existing, ...updateTemplate };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const existing = this.templates.get(id);
    if (!existing) return false;

    // Prevent deleting default system templates
    if (existing.isDefault) return false;

    return this.templates.delete(id);
  }
}

// Factory function to create storage instance based on configuration
export function createStorage(userId?: string): IStorage {
  // Use DatabaseStorage when database URL is configured
  if (process.env.DATABASE_URL) {
    return new DatabaseStorage(userId);
  }
  // Fall back to in-memory storage for development
  return new MemStorage(userId);
}

// Export a default storage instance for backward compatibility
// This will be replaced in routes with user-specific instances
export const storage = createStorage();
