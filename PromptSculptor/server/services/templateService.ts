import { InsertTemplate } from '../../shared/schema.js';

/**
 * Centralized template service to prevent duplication across storage implementations
 * Single source of truth for default templates
 */
export class TemplateService {
  private static instance: TemplateService;
  private static defaultTemplates: InsertTemplate[] | null = null;

  private constructor() {}

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Get the canonical default templates
   * This is the single source of truth for template definitions
   */
  getDefaultTemplates(): InsertTemplate[] {
    if (!TemplateService.defaultTemplates) {
      TemplateService.defaultTemplates = [
        {
          slug: "default-analysis",
          name: "Analysis",
          type: "analysis",
          description: "Data analysis, research, and insights",
          icon: "fas fa-chart-line",
          iconColor: "blue",
          sampleInput: "I need to analyze customer feedback data to identify key themes and sentiment patterns. The analysis should include specific examples and actionable recommendations for improving our product.",
          promptStructure: {
            sections: ["role", "task", "context", "requirements", "outputFormat"],
            includeExamples: true,
            useXMLTags: true
          }
        },
        {
          slug: "default-writing",
          name: "Writing",
          type: "writing",
          description: "Content creation and copywriting",
          icon: "fas fa-pen",
          iconColor: "green",
          sampleInput: "Write a blog post about the latest trends in artificial intelligence, focusing on practical applications for small businesses. The tone should be informative but accessible.",
          promptStructure: {
            sections: ["role", "task", "context", "requirements", "outputFormat"],
            includeExamples: true,
            useXMLTags: true
          }
        },
        {
          slug: "default-coding",
          name: "Coding",
          type: "coding",
          description: "Programming and development tasks",
          icon: "fas fa-code",
          iconColor: "purple",
          sampleInput: "Review this Python code for performance optimization opportunities and suggest improvements following best practices for clean, maintainable code.",
          promptStructure: {
            sections: ["role", "task", "context", "requirements", "outputFormat"],
            includeExamples: true,
            useXMLTags: true
          }
        },
        {
          slug: "default-custom",
          name: "Custom",
          type: "custom",
          description: "Start from scratch with your own requirements",
          icon: "fas fa-plus",
          iconColor: "orange",
          sampleInput: "Create a custom prompt for your specific use case. Describe your requirements in detail.",
          promptStructure: {
            sections: ["role", "task", "context", "requirements", "outputFormat"],
            includeExamples: false,
            useXMLTags: false
          }
        }
      ];
    }
    
    return TemplateService.defaultTemplates;
  }

  /**
   * Reset templates (useful for testing)
   */
  resetTemplates(): void {
    TemplateService.defaultTemplates = null;
  }
}