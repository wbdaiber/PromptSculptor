// Central AI model configuration — override via environment variables on Vercel
export const MODEL_CONFIG = {
  anthropic: {
    modelId: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    maxTokens: 2000,
    temperature: 0.7,
  },
  openai: {
    modelId: process.env.OPENAI_MODEL || "gpt-5.2-2025-12-11",
    maxTokens: 2000,
    temperature: 0.7,
  },
  gemini: {
    modelId: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
  },
} as const;
