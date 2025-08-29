import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env";

/**
 * Secure API Key Manager
 * Validates API keys and provides secure client instances
 */
export class APIKeyManager {
  private static openaiClient: OpenAI | null = null;
  private static anthropicClient: Anthropic | null = null;
  private static geminiClient: GoogleGenAI | null = null;
  
  /**
   * Validates API key format and basic properties
   */
  private static validateKey(key: string | undefined, service: string): boolean {
    if (!key || key.trim() === '' || key === 'your-key-here' || key.startsWith('sk-...')) {
      if (config.NODE_ENV === 'development') {
        console.warn(`⚠️  ${service} API key not configured - demo mode available`);
      }
      return false;
    }
    
    // Validate key format patterns
    if (service === 'OpenAI') {
      return key.startsWith('sk-') && key.length > 40;
    }
    
    if (service === 'Anthropic') {
      return key.startsWith('sk-ant-') && key.length > 40;
    }
    
    if (service === 'Gemini') {
      return key.startsWith('AIza') && key.length > 30;
    }
    
    return false;
  }
  
  /**
   * Get validated OpenAI client instance
   */
  static getOpenAIClient(): OpenAI | null {
    if (this.openaiClient) {
      return this.openaiClient;
    }
    
    const apiKey = config.OPENAI_API_KEY;
    if (!this.validateKey(apiKey, 'OpenAI')) {
      return null;
    }
    
    try {
      this.openaiClient = new OpenAI({ apiKey: apiKey! });
      return this.openaiClient;
    } catch (error) {
      if (config.NODE_ENV === 'development') {
        console.error('Failed to initialize OpenAI client:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }
  
  /**
   * Get validated Anthropic client instance
   */
  static getAnthropicClient(): Anthropic | null {
    if (this.anthropicClient) {
      return this.anthropicClient;
    }
    
    // Support both ANTHROPIC_API_KEY and legacy CLAUDE_API_KEY
    const apiKey = config.ANTHROPIC_API_KEY || config.CLAUDE_API_KEY;
    if (!this.validateKey(apiKey, 'Anthropic')) {
      return null;
    }
    
    try {
      this.anthropicClient = new Anthropic({ apiKey: apiKey! });
      return this.anthropicClient;
    } catch (error) {
      if (config.NODE_ENV === 'development') {
        console.error('Failed to initialize Anthropic client:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }
  
  /**
   * Get validated Gemini client instance
   */
  static getGeminiClient(): GoogleGenAI | null {
    if (this.geminiClient) {
      return this.geminiClient;
    }
    
    const apiKey = config.GEMINI_API_KEY;
    if (!this.validateKey(apiKey, 'Gemini')) {
      return null;
    }
    
    try {
      this.geminiClient = new GoogleGenAI({ apiKey: apiKey! });
      return this.geminiClient;
    } catch (error) {
      if (config.NODE_ENV === 'development') {
        console.error('Failed to initialize Gemini client:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }
  
  /**
   * Check if any AI service is available
   */
  static hasAnyAPIKey(): boolean {
    return this.getOpenAIClient() !== null || this.getAnthropicClient() !== null || this.getGeminiClient() !== null;
  }
  
  /**
   * Get service availability status (for health checks)
   */
  static getServiceStatus() {
    return {
      openai: this.getOpenAIClient() !== null,
      anthropic: this.getAnthropicClient() !== null,
      gemini: this.getGeminiClient() !== null,
      hasAnyService: this.hasAnyAPIKey()
    };
  }
  
  /**
   * Reset client instances (useful for testing or key rotation)
   */
  static resetClients(): void {
    this.openaiClient = null;
    this.anthropicClient = null;
    this.geminiClient = null;
  }
}