# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Updated 08-29-2025.

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
  - **Demo Mode Detection**: Only shows when user is unauthenticated OR authenticated without API keys
  - **State Management**: Auto-clears demo state when users add API keys (no dependency on generation history)
- **API Key Manager** (`client/src/components/settings/ApiKeyManager.tsx`): Service status dashboard and onboarding guidance
- **Template System** (`client/src/components/template-dropdown.tsx`): **NEW COMPONENT - Aug 29, 2025**
  - **Left Sidebar Layout**: Templates moved from horizontal grid to collapsible left sidebar dropdown
  - **Space Optimization**: Reclaimed 200+ pixels of vertical space for better content visibility
  - **Responsive Design**: Desktop sidebar with mobile/tablet dropdown fallback
  - **Enhanced UX**: Auto-collapse on mobile after selection, selected template indicator

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

### Recent Critical Fixes & UX Improvements (Aug 2025)

**Authentication & Cache Management**:
- **Template Cache Isolation**: Fixed React Query cache persistence causing authenticated user templates to appear in demo mode after logout
  - Modified `client/src/lib/queryClient.ts`: Changed `staleTime: Infinity` → `staleTime: 0` for proper cache invalidation
  - Enhanced `client/src/context/AuthContext.tsx`: Added aggressive cache clearing with `queryClient.removeQueries()` on logout
  - Updated `client/src/pages/home.tsx`: Added authentication state to template query keys for proper cache scoping
- **Session Authentication**: Fixed authentication validation in protected routes to check both `req.user` and `req.userId`
  - Updated `server/routes.ts`: Fixed template/prompt creation/modification endpoints authentication logic

**UX Architecture Redesign (Aug 29, 2025)**:
- **Template Interface Transformation**: Completely restructured template presentation from horizontal grid to sidebar dropdown
  - **New Layout**: `client/src/pages/home.tsx` now uses flex layout with 320px fixed left sidebar on desktop
  - **Component Architecture**: Created `client/src/components/template-dropdown.tsx` using Radix UI Collapsible primitives
  - **Space Efficiency**: Freed up 200+ pixels of vertical space, improving content visibility and reducing scroll requirements
  - **Responsive Strategy**: Desktop sticky sidebar, mobile/tablet collapsible dropdown with auto-close behavior
  - **Preserved Functionality**: All existing template selection, editing, and deletion features maintained
- **Advanced Options Integration**: Streamlined UI by consolidating advanced options into collapsible section
  - **Unified Interface**: `client/src/components/input-section.tsx` now contains integrated advanced options within Natural Language Input card
  - **Progressive Disclosure**: Advanced options (target model, complexity, examples, XML tags, constraints) accessible via expandable section
  - **Improved UX**: Reduced visual clutter while maintaining full functionality with smooth animation transitions
  - **Component Consolidation**: Eliminated separate Advanced Options card, creating more cohesive single-card interface

### Development Notes
- **Environment Variables**: `.env` API keys are now optional and primarily for admin/testing
- **User API Keys**: Primary generation method - stored encrypted in PostgreSQL with AES-256-GCM
- **Demo Mode**: High-quality template-based prompts with NLP keyword extraction
- **Error Handling**: API key failures gracefully fallback to demo mode with appropriate messaging
- **Cache Management**: React Query configured for immediate invalidation of user-sensitive data with proper authentication state dependency