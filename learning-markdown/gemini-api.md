# Gemini API Integration Documentation

## Overview
This document describes the implementation of Google Gemini API support in PromptSculptor, allowing users to generate prompts using Google's Gemini Pro model.

## Implementation Date
- **Date**: August 25, 2025
- **Version**: 1.0.0
- **Package**: @google/generative-ai v0.24.1

## Architecture Overview

### 1. Environment Configuration
**File**: `server/config/env.ts`
- Added `GEMINI_API_KEY` to environment schema
- Validates presence of at least one API key in production
- Key format: Must start with `AIza` and be at least 30 characters

### 2. API Key Management
**File**: `server/services/apiKeyManager.ts`

The APIKeyManager class now supports three AI services:
- OpenAI (keys starting with `sk-`)
- Anthropic (keys starting with `sk-ant-`)
- Gemini (keys starting with `AIza`)

Key methods added:
```typescript
static getGeminiClient(): GoogleGenerativeAI | null
static validateKey(key: string, service: string): boolean
```

### 3. Prompt Generation
**File**: `server/services/promptGenerator.ts`

Added `generateWithGemini()` function that:
- Uses Gemini Pro model for text generation
- Handles JSON response parsing
- Implements fallback to demo mode on errors
- Maintains consistent error handling patterns

## How to Verify Gemini API is Working

### 1. Configuration Verification

First, ensure your environment is properly configured:

```bash
# Check if GEMINI_API_KEY is set in your .env file
grep GEMINI_API_KEY .env

# Should show something like:
# GEMINI_API_KEY=AIzaSy...your-key-here
```

### 2. Console Log Indicators

When Gemini API is being used successfully, you'll see these indicators:

#### Success Indicators:
- **No error messages** in the console when selecting Gemini
- **API response time** typically 1-3 seconds for prompt generation
- **Quality score of 87** returned for Gemini-generated prompts

#### In Development Mode:
If there's an issue, you'll see specific error messages:
```
Failed to initialize Gemini client: [error message]
Gemini API error [error-id]: [error details]
Gemini response parsing failed: [parse error]
```

#### Fallback to Demo Mode:
When no Gemini API key is configured:
```
⚠️  Gemini API key not configured - demo mode available
```

### 3. Frontend Verification

In the UI, you can verify Gemini is working by:

1. **API Key Manager** (Settings → API Keys):
   - Successfully added Gemini key shows with 💎 icon
   - Key validation passes (must start with `AIza`)
   - Service status shows as active

2. **Prompt Generation**:
   - Select "Gemini (Google)" from Target Model dropdown
   - Click "Generate Prompt"
   - Success indicators:
     - Toast notification: "Prompt Generated"
     - Prompt appears in output section
     - Title shows "Gemini Generated Prompt" (in fallback mode)

### 4. Network Verification

Monitor network requests in browser DevTools:

1. Open DevTools → Network tab
2. Generate a prompt with Gemini selected
3. Look for POST request to `/api/generate`
4. Request payload should include:
   ```json
   {
     "targetModel": "gemini",
     "naturalLanguageInput": "...",
     ...
   }
   ```
5. Response should include:
   ```json
   {
     "generatedPrompt": "...",
     "title": "...",
     "wordCount": 123,
     "qualityScore": 87
   }
   ```

### 5. Backend Verification

Add debug logging to verify Gemini client initialization:

```typescript
// In server/services/promptGenerator.ts
if (isGeminiModel) {
  console.log('Using Gemini API for prompt generation');
  const geminiClient = APIKeyManager.getGeminiClient();
  if (!geminiClient) {
    console.log('Gemini client not available, falling back to demo');
    return generateDemoPrompt(request);
  }
  console.log('Gemini client initialized successfully');
  return generateWithGemini(request, geminiClient);
}
```

### 6. Testing Checklist

- [ ] Gemini API key added to `.env` file
- [ ] Server restarted after adding API key
- [ ] "Gemini (Google)" appears in Target Model dropdown
- [ ] Prompt generation works with Gemini selected
- [ ] No TypeScript compilation errors (`npm run check`)
- [ ] API key validation prevents invalid keys (not starting with `AIza`)
- [ ] Fallback to demo mode works when no key is present
- [ ] Error messages are properly logged in development mode

## Troubleshooting

### Common Issues and Solutions

1. **"Gemini API key not configured"**
   - Solution: Add `GEMINI_API_KEY=AIza...` to your `.env` file
   - Get a key from: https://aistudio.google.com/app/apikey

2. **"Failed to initialize Gemini client"**
   - Check API key format (must start with `AIza`)
   - Verify key is active in Google AI Studio
   - Ensure key has proper permissions

3. **"Failed to generate structured prompt with Gemini"**
   - Check API quotas in Google Cloud Console
   - Verify network connectivity
   - Check for rate limiting (429 errors)

4. **JSON Parsing Errors**
   - Gemini response may not be valid JSON
   - System falls back to raw text response
   - Check prompt instructions for JSON formatting

### Debug Mode

To enable detailed logging, set in your `.env`:
```bash
NODE_ENV=development
```

This will show:
- Detailed error messages
- API response parsing attempts
- Fallback behavior logs

## Security Considerations

1. **API Key Storage**:
   - Keys are encrypted before database storage
   - Never logged in production
   - Validated for format before acceptance

2. **Error Handling**:
   - Sensitive information stripped from error messages
   - Error IDs generated for tracking without exposing details
   - Graceful fallback to demo mode

3. **Rate Limiting**:
   - Inherits application-wide rate limiting
   - Gemini API has its own quotas (check Google Cloud Console)

## API Differences from Other Services

| Feature | OpenAI | Anthropic | Gemini |
|---------|---------|-----------|---------|
| Model | gpt-4o | claude-sonnet-4 | gemini-pro |
| Key Prefix | sk- | sk-ant- | AIza |
| Response Format | Chat completion | Messages | Generate content |
| JSON Mode | Native support | Parse from text | Parse from text |
| Quality Score | 85 | 88 | 87 |

## Implementation Summary

### Changes Made:

1. **Package Installation**: Added `@google/generative-ai` SDK (v0.24.1) to the project dependencies

2. **Environment Configuration** (`server/config/env.ts`):
   - Added `GEMINI_API_KEY` to the environment schema
   - Updated production validation to include Gemini in the API key check
   - Updated `.env.example` with documentation for the new key

3. **API Key Manager** (`server/services/apiKeyManager.ts`):
   - Imported Google Generative AI SDK
   - Added `geminiClient` static property for singleton management
   - Implemented `getGeminiClient()` method with proper validation
   - Updated key validation to check for Gemini format (keys starting with 'AIza')
   - Extended service status and reset methods to include Gemini

4. **Prompt Generation** (`server/services/promptGenerator.ts`):
   - Created `generateWithGemini()` function using Gemini Pro model
   - Integrated proper error handling and fallback to demo mode
   - Updated main routing logic to use Gemini when selected

## Quick Start Guide

1. **Add your Gemini API key** to your `.env` file:
   ```
   GEMINI_API_KEY=AIza...your-key-here
   ```

2. **Get a Gemini API key** from: https://aistudio.google.com/app/apikey

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

4. **In the application**:
   - Users can add their Gemini API key through Settings → API Keys
   - Select "Gemini (Google)" from the Target Model dropdown when generating prompts
   - The system will automatically use the Gemini Pro model for text generation

## Security Features Maintained

- API keys are validated for proper format before storage
- Secure client initialization with error handling
- Fallback to demo mode when no API key is present
- Proper error logging without exposing sensitive information

## Future Enhancements

1. **Multi-modal Support**: Gemini supports image inputs - could extend for visual prompts
2. **Model Selection**: Add support for Gemini Pro Vision, Gemini Ultra
3. **Streaming Responses**: Implement streaming for faster perceived performance
4. **Caching**: Add response caching for repeated prompts
5. **Analytics**: Track usage across different models

## Related Files

- `/server/config/env.ts` - Environment configuration
- `/server/services/apiKeyManager.ts` - API client management
- `/server/services/promptGenerator.ts` - Prompt generation logic
- `/client/src/components/settings/ApiKeyManager.tsx` - Frontend key management
- `/client/src/components/input-section.tsx` - Model selection UI
- `/.env.example` - Environment variable documentation

## Support

For issues related to Gemini API integration:
1. Check this documentation first
2. Verify API key and quotas in Google AI Studio
3. Review console logs in development mode
4. Check network requests in browser DevTools

---

*Implementation completed successfully with TypeScript compilation passing. The implementation follows the same secure patterns used for OpenAI and Anthropic integrations, ensuring consistency across the codebase.*