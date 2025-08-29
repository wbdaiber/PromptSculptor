# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Updated 08-28-2025.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 5001)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Database migrations
npm run db:push
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Wouter routing, shadcn/ui components, TanStack Query
- **Backend**: Express.js with TypeScript, Drizzle ORM, PostgreSQL
- **Authentication**: Passport.js with express-session
- **API Integration**: OpenAI, Anthropic Claude, Google Gemini

### Project Structure

**Client (`/client/src/`)**
- React app with context-based authentication and theming
- Components use shadcn/ui library (Radix UI primitives with Tailwind)
- API calls via TanStack Query with centralized client (`lib/queryClient.ts`)
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`

**Server (`/server/`)**
- Express API with TypeScript, runs on port 5001
- Storage abstraction: `IStorage` interface with memory/database implementations
- Security: Helmet CSP, CORS, rate limiting, input sanitization
- Session-based auth with optional API key authentication

**Shared (`/shared/`)**
- Database schema definitions using Drizzle ORM
- Zod schemas for validation
- Shared types between client and server

### Key Services

**Prompt Generation (`server/services/promptGenerator.ts`)** - **RECENTLY REFACTORED**
- **User-Aware Generation**: Primary system uses user's encrypted API keys
- **Enhanced Demo Mode**: High-quality template-based generation with contextual guidance
- **Smart Fallback System**: User Keys → Enhanced Demo → Graceful Error Handling
- **Multi-Model Support**: OpenAI (GPT), Anthropic (Claude), and Google Gemini
- **Context-Aware Messaging**: Different guidance for authenticated vs unauthenticated users

**User API Key Manager (`server/services/userApiKeyManager.ts`)** - **NEW SERVICE**
- **Dynamic Client Creation**: User-specific API clients with 5-minute caching
- **Secure Key Retrieval**: Encrypted database storage with decryption on demand
- **Service Validation**: API key format validation for OpenAI, Anthropic, Gemini
- **Performance Optimization**: Intelligent caching system for frequently used keys

**Enhanced Demo Mode (`server/services/enhancedDemoMode.ts`)** - **NEW SERVICE**
- **Template-Based Generation**: High-quality prompts using NLP techniques
- **Contextual Guidance**: Service-specific messaging for API key onboarding
- **Domain Detection**: Smart keyword extraction for personalized templates
- **User State Awareness**: Different messaging for authenticated vs anonymous users

**Storage Pattern**
- `createStorage(userId?)` factory returns appropriate storage implementation
- DatabaseStorage for authenticated users
- MemStorage for anonymous/demo usage
- All storage operations scoped to user context

### Security Considerations
- All user inputs sanitized via DOMPurify
- API keys encrypted before database storage  
- Rate limiting on AI endpoints
- Session security with secure cookies in production
- CORS configured for specific origins

### Recent Architecture Refactoring (Phases 1-5 Complete)

**User-Aware Prompt Generation System**: The application has been transformed from a static environment-variable-based system to a dynamic user-centric architecture.

**Key Architecture Changes**:
- **Priority System**: User Keys → Enhanced Demo → Environment Variables (optional)
- **User Context**: All prompt generation includes `UserContext` with `userId`, `isAuthenticated`, and `dbStorage`
- **Smart Persistence**: Demo mode prompts are not saved; only AI-generated prompts are persisted
- **Enhanced Response Format**: API responses include `demoInfo` with contextual messaging

**Frontend Components Updated**:
- **Input Section** (`client/src/components/input-section.tsx`): Demo mode indicators with call-to-action buttons
- **API Key Manager** (`client/src/components/settings/ApiKeyManager.tsx`): Service status dashboard and onboarding guidance

**Testing Status**: All user flows validated (unauthenticated users, authenticated users with/without keys, error scenarios)

### Feature Implementation Status
- ✅ **User-Centric Prompt Generation**: Primary system uses user's encrypted API keys
- ✅ **Enhanced Demo Mode**: Template-based generation with contextual guidance  
- ✅ **Multi-Model Support**: OpenAI (GPT), Anthropic (Claude), Google Gemini
- ✅ **Smart Fallback System**: Graceful degradation from user keys to demo mode
- ✅ **Frontend Integration**: Demo mode indicators and service status dashboard
- ✅ **User Authentication**: Session-based auth with unauthenticated demo support
- ✅ **API Key Management**: Encrypted storage with user-specific retrieval
- ✅ **Performance Optimization**: Caching system for API clients and demo responses

### Development Notes
- **Environment Variables**: `.env` API keys are now optional and primarily for admin/testing
- **User API Keys**: Primary generation method - stored encrypted in PostgreSQL with AES-256-GCM
- **Demo Mode**: High-quality template-based prompts with NLP keyword extraction
- **Error Handling**: API key failures gracefully fallback to demo mode with appropriate messaging