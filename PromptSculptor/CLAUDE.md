# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Updated 08-30-2025.

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
- **State Isolation on Logout**: Component-level state cleared when users log out to prevent data leakage between sessions

### Recent Architecture Refactoring (Phases 1-5 Complete)

**User-Aware Prompt Generation System**: The application has been transformed from a static environment-variable-based system to a dynamic user-centric architecture.

**Key Architecture Changes**:
- **Priority System**: User Keys → Enhanced Demo → Environment Variables (optional)
- **User Context**: All prompt generation includes `UserContext` with `userId`, `isAuthenticated`, and `dbStorage`
- **Smart Persistence**: Demo mode prompts are not saved; only AI-generated prompts are persisted
- **Enhanced Response Format**: API responses include `demoInfo` with contextual messaging

**Frontend Components Updated**:
- **Input Section** (`client/src/components/input-section.tsx`): Streamlined natural language input interface
  - **Focused Interface**: Demo mode indicators removed for cleaner, less cluttered input experience
  - **Advanced Options**: Integrated collapsible advanced options within main input card
- **Demo Mode Integration** (`client/src/pages/home.tsx`): Contextual demo mode indicators moved to sidebar
  - **Strategic Placement**: Demo mode notifications positioned beneath Quick Start Templates in left sidebar
  - **Contextual Messaging**: Different messages and buttons for unauthenticated users ("Create Free Account") vs authenticated users without API keys ("Add API Keys")
  - **Responsive Design**: Shows in desktop sidebar and mobile template section
  - **State Management**: Auto-clears demo state when users add API keys (no dependency on generation history)
- **API Key Manager** (`client/src/components/settings/ApiKeyManager.tsx`): Service status dashboard and onboarding guidance
- **Template System** (`client/src/components/template-dropdown.tsx`): **NEW COMPONENT - Aug 29, 2025**
  - **Left Sidebar Layout**: Templates moved from horizontal grid to collapsible left sidebar dropdown
  - **Space Optimization**: Reclaimed 200+ pixels of vertical space for better content visibility
  - **Responsive Design**: Desktop sidebar with mobile/tablet dropdown fallback
  - **Enhanced UX**: Auto-collapse on mobile after selection, selected template indicator
- **Help Modal** (`client/src/components/help-modal.tsx`): **NEW COMPONENT - Aug 30, 2025**
  - **Onboarding Experience**: Comprehensive help modal accessible via "Start Here" button in header
  - **User Guidance**: Step-by-step instructions on how to use the app, create accounts, and add API keys
  - **Feature Overview**: Explains all app capabilities including templates, advanced options, and recent prompts
  - **Universal Design**: Single modal serves all users regardless of authentication status
  - **Visual Guide**: Includes icons, structured sections, and clear call-to-action buttons

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
- ✅ **Help & Onboarding**: Interactive help modal with comprehensive user guidance
- ✅ **Favorite Prompts System**: Complete CRUD operations for user's favorite prompts

### Favorite Prompts System Architecture (Aug 2025)

**Complete Implementation**: User-centric favorites system with full CRUD operations and real-time synchronization.

**Backend Components**:
- **Database Schema** (`shared/schema.ts`): Added `isFavorite: boolean("is_favorite").notNull().default(false)` to prompts table
- **Storage Layer** (`server/storage.ts`, `server/databaseStorage.ts`): 
  - `getFavoritePrompts(limit?: number)` - Retrieves user's favorited prompts
  - `togglePromptFavorite(id: string, isFavorite: boolean)` - Updates favorite status with user scoping
- **API Endpoints** (`server/routes.ts`):
  - `GET /api/prompts/favorites` - Protected endpoint for user's favorites (lines 366-393)
  - `PATCH /api/prompts/:id/favorite` - Protected toggle endpoint (lines 395-433)
  - Full authentication validation and error handling

**Frontend Components**:
- **FavoritePrompts** (`client/src/components/favorite-prompts.tsx`): **NEW COMPONENT - Aug 30, 2025**
  - Dedicated section displaying user's favorited prompts below Recent Prompts (limited to 6)
  - "View All" navigation to dedicated favorites dashboard
  - Grid layout with visual distinction (yellow border, filled heart icon)
  - Complete CRUD operations: view, copy, edit, delete, unfavorite
  - Optimistic updates with proper error handling and rollback
- **Favorites Dashboard** (`client/src/pages/favorites.tsx`): **NEW PAGE - Aug 30, 2025**
  - Dedicated `/favorites` route showing unlimited favorites with full dashboard
  - Authentication-protected with automatic redirect to home for non-authenticated users
  - Complete favorites management with empty state and responsive 4-column grid
- **FavoritePromptCard** (`client/src/components/favorite-prompt-card.tsx`): **NEW SHARED COMPONENT - Aug 30, 2025**
  - Reusable card component with complete CRUD operations
  - Shared between home page preview and full favorites dashboard
- **Enhanced Recent Prompts** (`client/src/components/recent-prompts.tsx`):
  - Added heart icon toggle to each prompt card
  - Real-time favorite status synchronization across components
  - Visual feedback: filled yellow heart for favorites, outline for regular prompts
- **Output Section Integration** (`client/src/components/output-section.tsx`):
  - Replaced non-functional "Regenerate" button with "Save to Favorites"
  - Authentication-aware functionality with appropriate error messaging
  - Toast notifications for user feedback

**API Client Layer** (`client/src/lib/api.ts`):
- `getFavoritePrompts(limit?: number)` - Fetches user's favorites with caching
- `togglePromptFavorite(id: string, isFavorite: boolean)` - Toggle operation with proper typing

**Key Features**:
- **User Scoping**: All operations properly scoped to authenticated user's data
- **Real-time Updates**: Changes immediately reflect across Recent Prompts and Favorites sections
- **Optimistic UI**: Instant visual feedback with graceful error recovery
- **Data Persistence**: Favorite status persists across sessions with database storage
- **Authentication Integration**: Only available to logged-in users with session validation
- **Performance**: Efficient queries with proper indexing and caching strategies
- **Unlimited Storage**: No limit on favorite prompts saved, with display limits for UI performance
- **Navigation**: Wouter routing integration with `/favorites` route for dedicated dashboard view

### Recent Prompts Full Dashboard (Aug 30, 2025)

**Complete Implementation**: Recent prompts "View All" functionality following the favorites pattern.

**Frontend Components**:
- **Recent Prompts** (`client/src/components/recent-prompts.tsx`): **UPDATED - Aug 30, 2025**
  - Added navigation functionality to "View All" button using `useLocation` hook
  - Button now navigates to `/recent` route for dedicated dashboard view
  - Home page preview maintains existing 6-prompt limit and visual design
- **Recent Dashboard** (`client/src/pages/recent.tsx`): **NEW PAGE - Aug 30, 2025**
  - Dedicated `/recent` route showing up to 20 recent prompts (vs 6 on home)
  - Authentication-protected with automatic redirect to home for non-authenticated users
  - Complete recent prompts management with empty state and responsive 4-column grid
  - Same header/layout pattern as favorites page for consistency
- **RecentPromptCard** (`client/src/components/recent-prompt-card.tsx`): **NEW SHARED COMPONENT - Aug 30, 2025**
  - Reusable card component for the full recent prompts dashboard
  - Complete CRUD operations: view, copy, edit, delete, favorite toggle
  - Consistent design with home page recent prompts cards
  - Real-time favorite status synchronization with other components

**API Integration**:
- Leverages existing `getRecentPrompts(limit)` function with 20-prompt limit for dashboard
- Maintains 6-prompt limit for home page preview section
- Full cache management and optimistic UI updates

**Key Features**:
- **Limit Management**: Home preview (6 prompts) vs Dashboard (20 prompts)
- **User Scoping**: All operations properly scoped to authenticated user's data
- **Real-time Updates**: Changes immediately reflect across Recent and Favorites sections
- **Authentication Integration**: Protected route with session validation
- **Performance**: Efficient queries with proper caching strategies
- **Navigation**: Wouter routing integration with `/recent` route

### Recent Critical Fixes & UX Improvements (Aug 2025)

**Authentication & Cache Management**:
- **Template Cache Isolation**: Fixed React Query cache persistence causing authenticated user templates to appear in demo mode after logout
  - Modified `client/src/lib/queryClient.ts`: Changed `staleTime: Infinity` → `staleTime: 0` for proper cache invalidation
  - Enhanced `client/src/context/AuthContext.tsx`: Added aggressive cache clearing with `queryClient.removeQueries()` on logout
  - Updated `client/src/pages/home.tsx`: Added authentication state to template query keys for proper cache scoping
- **User Input State Isolation**: Fixed component-level state persistence causing user prompts to remain visible after logout
  - Updated `client/src/components/input-section.tsx`: Added `useEffect` hook to clear `naturalLanguageInput` and `lastGeneratedResult` when user logs out
  - **Security Impact**: Prevents data leakage between user sessions and ensures proper session boundaries
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

### User Profile Management System (Aug 30, 2025)

**Complete Redesign**: Streamlined profile interface focusing on core account management with password and account deletion capabilities.

**Backend Implementation**:
- **Password Management** (`server/databaseStorage.ts`): Added `updateUserPassword()` and `deleteUser()` methods with bcrypt verification
- **Authentication Routes** (`server/routes/auth.ts`): New endpoints `PATCH /auth/change-password` and `DELETE /auth/account` with Zod validation
- **API Client** (`client/src/lib/api.ts`): Added `changePassword()` and `deleteAccount()` functions
- **Auth Context** (`client/src/context/AuthContext.tsx`): Extended with password/account management methods

**Frontend Components**:
- **UserProfile** (`client/src/components/settings/UserProfile.tsx`): **REDESIGNED - Aug 30, 2025**
  - **Simplified Layout**: Removed account stats, security features, and member info sections
  - **Core Information**: Displays email, username, and masked password with view toggle
  - **Interactive Controls**: Change password button and delete account in Account Actions
  - **Clean Interface**: Focused on essential account management without verbose information
- **ChangePasswordDialog** (`client/src/components/settings/ChangePasswordDialog.tsx`): **NEW COMPONENT - Aug 30, 2025**
  - **Secure Workflow**: Current password verification with new password confirmation
  - **User Experience**: Password visibility toggles, client-side validation, and loading states
  - **Error Handling**: Comprehensive validation with user-friendly error messages
- **DeleteAccountDialog** (`client/src/components/settings/DeleteAccountDialog.tsx`): **NEW COMPONENT - Aug 30, 2025**
  - **Destructive Action Protection**: Password confirmation and explicit data loss warnings
  - **Comprehensive Warnings**: Details what data will be permanently deleted
  - **Multi-step Confirmation**: Password + checkbox confirmation for permanent deletion

**Key Features**:
- **Security First**: All operations require password verification with input sanitization
- **User Experience**: Toast notifications, loading states, and progressive disclosure
- **Data Protection**: Comprehensive warnings and confirmations for destructive actions
- **Session Management**: Proper logout and cache clearing after account deletion

### Toast Notification System

**Implementation**: Uses shadcn/ui toast system with custom hook pattern for user feedback.

**Usage Pattern**:
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success notification
toast({
  title: "Success",
  description: "Operation completed successfully!",
});

// Error notification  
toast({
  title: "Error", 
  description: "Something went wrong. Please try again.",
  variant: "destructive",
});
```

**Components**: 
- **Hook**: `client/src/hooks/use-toast.ts` - Custom hook for toast state management
- **UI Component**: `client/src/components/ui/toast.tsx` - Radix UI toast primitive wrapper
- **Toaster**: `client/src/components/ui/toaster.tsx` - Toast container component
- **Integration**: Used throughout app for user feedback (form submissions, API responses, etc.)

**Toast System Features**:
- **Auto-dismiss**: Configurable timeout with manual dismiss option
- **Queue Management**: Multiple toasts with proper stacking and removal
- **Variants**: Success, error, warning, and default styles
- **Accessibility**: Screen reader friendly with proper ARIA attributes

### Development Notes
- **Environment Variables**: `.env` API keys are now optional and primarily for admin/testing
- **User API Keys**: Primary generation method - stored encrypted in PostgreSQL with AES-256-GCM
- **Demo Mode**: High-quality template-based prompts with NLP keyword extraction
- **Error Handling**: API key failures gracefully fallback to demo mode with appropriate messaging
- **Cache Management**: React Query configured for immediate invalidation of user-sensitive data with proper authentication state dependency
- **Toast Notifications**: All user-facing operations provide feedback through the toast system