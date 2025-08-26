import { type Prompt, type InsertPrompt, type Template, type InsertTemplate } from "@shared/schema";
import { randomUUID } from "crypto";
import { DatabaseStorage } from "./databaseStorage";
import { TemplateService } from "./services/templateService";

export interface IStorage {
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPrompts(): Promise<Prompt[]>;
  getRecentPrompts(limit?: number): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: string): Promise<boolean>;
  
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplates(): Promise<Template[]>;
  getTemplatesByType(type: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
}

export class MemStorage implements IStorage {
  private prompts: Map<string, Prompt>;
  private templates: Map<string, Template>;

  constructor() {
    this.prompts = new Map();
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    // Get templates from centralized service
    const templateService = TemplateService.getInstance();
    const defaultTemplates = templateService.getDefaultTemplates();

    defaultTemplates.forEach(template => {
      const id = randomUUID();
      const fullTemplate: Template = { ...template, id };
      this.templates.set(id, fullTemplate);
    });
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async getPrompts(): Promise<Prompt[]> {
    return Array.from(this.prompts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    const allPrompts = await this.getPrompts();
    return allPrompts.slice(0, limit);
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
      qualityScore: insertPrompt.qualityScore || 0,
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
    return this.templates.get(id);
  }

  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(template => template.type === type);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = { ...insertTemplate, id };
    this.templates.set(id, template);
    return template;
  }
}

// Factory function to create storage instance based on configuration
export function createStorage(userId?: string): IStorage {
  // Use DatabaseStorage when database URL is configured
  if (process.env.DATABASE_URL) {
    return new DatabaseStorage(userId);
  }
  // Fall back to in-memory storage for development
  return new MemStorage();
}

// Export a default storage instance for backward compatibility
// This will be replaced in routes with user-specific instances
export const storage = createStorage();
