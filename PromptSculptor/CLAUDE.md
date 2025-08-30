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

# Email System Testing & Maintenance
npx tsx server/testEmailService.ts                    # Test password reset email configuration
npx tsx server/testWelcomeEmail.ts <email>            # Test welcome email delivery
npx tsx server/testEmailOnly.ts <email>              # Test basic email delivery
npx tsx server/scripts/cleanupTokens.ts              # Manual token cleanup
npx tsx server/scripts/securityAudit.ts              # Comprehensive security audit
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Wouter routing, shadcn/ui components, TanStack Query
- **Backend**: Express.js with TypeScript, Drizzle ORM, PostgreSQL
- **Authentication**: Passport.js with express-session, enterprise password recovery system
- **API Integration**: OpenAI, Anthropic Claude, Google Gemini
- **Email Service**: Resend API with professional HTML/text templates for welcome and password recovery emails
- **Security**: Comprehensive monitoring, rate limiting, token management, and audit systems

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

**Email System (`server/services/emailService.ts`)** - **ENTERPRISE-READY EMAIL SYSTEM (Aug 2025)**
- **Welcome Emails**: Professional welcome emails sent automatically after user registration
- **Password Recovery Emails**: Secure password reset emails with cryptographic tokens
- **Professional Templates**: Responsive HTML/plain text templates with PromptSculptor branding
- **Non-blocking Design**: User registration succeeds even if welcome email delivery fails
- **Domain Verification**: Resend API integration with production domain verification support
- **Comprehensive Logging**: Detailed logging for email delivery status and debugging

**Password Recovery System (`server/services/`)** - **NEW ENTERPRISE-READY SYSTEM (Aug 2025)**
- **Token Service** (`tokenService.ts`): Cryptographically secure 32-byte tokens with SHA-256 hashing
- **Monitoring Service** (`monitoringService.ts`): Real-time security event logging with severity classification
- **Token Cleanup Service** (`tokenCleanupService.ts`): Automated expired token cleanup with scheduling
- **Security Features**: 30-minute token expiry, single-use enforcement, rate limiting (3/15min), no user enumeration
- **Production Ready**: Comprehensive security audit (20 tests passed), monitoring endpoints, deployment documentation

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
- **Password Recovery Security**: Enterprise-grade security with cryptographic tokens, rate limiting, and comprehensive monitoring
- **Security Monitoring**: Real-time security event logging with IP tracking and severity classification
- **Token Security**: SHA-256 hashing, single-use enforcement, automated cleanup, and 30-minute expiration

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
- ✅ **Welcome Email System**: Automated professional welcome emails for new user onboarding
- ✅ **Enterprise Password Recovery**: Complete password reset system with email delivery

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

### Welcome Email System (Aug 30, 2025)

**Complete Implementation**: Automated welcome email system that sends professional onboarding emails to new users immediately after registration.

**Architecture Components**:
- **Email Service Extension** (`server/services/emailService.ts`): Added `sendWelcomeEmail()` function with professional templates
- **Registration Integration** (`server/routes/auth.ts`): Welcome email sending integrated into user registration flow
- **Professional Templates**: Responsive HTML/plain text welcome email templates with PromptSculptor branding
- **Test Infrastructure** (`server/testWelcomeEmail.ts`): Dedicated test script for welcome email functionality

**Email Features**:
- **Personalized Welcome**: Greeting with user's username and account confirmation
- **Feature Overview**: Comprehensive introduction to PromptSculptor capabilities
- **Getting Started Guide**: Call-to-action buttons for immediate user engagement
- **Professional Design**: Consistent branding and responsive email templates
- **Multi-format Support**: Both HTML and plain text versions for maximum compatibility

**Technical Implementation**:
- **Non-blocking Design**: User registration always succeeds even if welcome email delivery fails
- **Error Handling**: Comprehensive error logging for debugging and monitoring
- **Domain Verification**: Production-ready with Resend domain verification support
- **Security**: No sensitive information exposed in email templates
- **Logging**: Detailed logging for email delivery status and troubleshooting

**Development & Testing**:
- **Test Command**: `npx tsx server/testWelcomeEmail.ts <email>` for standalone testing
- **Domain Limitations**: Development mode limited to verified account owner's email address
- **Production Ready**: Full functionality with domain verification for any recipient

**Status**: ✅ **PRODUCTION READY** - Welcome emails are automatically sent to all new users upon successful registration

### Enterprise Password Recovery System (Aug 30, 2025)

**Complete Implementation**: Production-ready password recovery system with enterprise-grade security, monitoring, and maintenance capabilities.

**⚠️ Developer Note - Rate Limiting**: Password reset requests are limited to **3 requests per 15 minutes per IP address** (`passwordResetLimiter` in `server/middleware/rateLimiter.ts:55-57`). After 3 requests, subsequent attempts return HTTP 429 with "Too many password reset requests" until the 15-minute window resets. This prevents abuse and spam.

**Architecture Components**:
- **Database Schema** (`shared/schema.ts`): `passwordResetTokens` table with user association, expiration, and usage tracking
- **Email Service** (`server/services/emailService.ts`): Professional HTML/plain text templates via Resend API with mobile responsiveness
- **Token Service** (`server/services/tokenService.ts`): Cryptographically secure token generation, validation, and SHA-256 hashing
- **Monitoring Service** (`server/services/monitoringService.ts`): Real-time security event logging with severity classification
- **Cleanup Service** (`server/services/tokenCleanupService.ts`): Automated expired token cleanup with scheduling and maintenance

**API Endpoints**:
- **Password Reset Request** (`POST /api/auth/forgot-password`): Rate-limited endpoint with user lookup and email dispatch
- **Password Reset Completion** (`POST /api/auth/reset-password`): Token validation and secure password update
- **Admin Monitoring** (`/api/monitoring/health`, `/api/monitoring/security`, `/api/monitoring/metrics`): Production monitoring endpoints

**Frontend Components**:
- **ForgotPasswordForm** (`client/src/components/auth/ForgotPasswordForm.tsx`): Email input with security-conscious messaging
- **ResetPasswordForm** (`client/src/components/auth/ResetPasswordForm.tsx`): Password reset with token extraction and strength validation
- **Page Integration** (`client/src/pages/ForgotPassword.tsx`, `client/src/pages/ResetPassword.tsx`): Dedicated routes with consistent branding
- **LoginForm Enhancement** (`client/src/components/auth/LoginForm.tsx`): Strategic "Forgot Password?" link placement

**Security Features**:
- **Cryptographically Secure Tokens**: 32-byte random tokens using Node.js crypto module
- **SHA-256 Token Hashing**: Tokens hashed before database storage (never store raw tokens)
- **Time-Limited Access**: 30-minute token expiration with automated cleanup
- **Single-Use Enforcement**: Database flag prevents token reuse and replay attacks
- **Rate Limiting Protection**: 3 requests per 15 minutes per IP address with security logging
- **No User Enumeration**: Consistent response patterns prevent email address discovery
- **IP Tracking**: All security events logged with client IP addresses for monitoring
- **Input Sanitization**: Comprehensive Zod schema validation for all inputs

**Production Features**:
- **Email Delivery**: Successfully tested with real Gmail delivery via Resend API
- **Automated Maintenance**: Scheduled token cleanup (60 min dev, 240 min production)
- **Security Monitoring**: Real-time event logging with severity levels (low, medium, high, critical)
- **Health Monitoring**: Admin endpoints for system health, security reports, and metrics
- **Graceful Shutdown**: Proper cleanup scheduler termination on server shutdown
- **Comprehensive Documentation**: Complete deployment guide with security checklist

**Testing & Validation**:
- **End-to-End Testing**: Complete user flow validated from email request to successful password reset
- **Security Audit**: 20 comprehensive security tests with **PRODUCTION READY** assessment
- **Rate Limiting Validation**: Confirmed protection against brute force attacks
- **Email Template Testing**: Professional templates tested across email clients
- **Token Security Testing**: Cryptographic randomness and hashing validation

**Production Status**: ✅ **ENTERPRISE-READY** with comprehensive security audit completion (19/20 tests passed, 1 minor warning)

**Recent Fixes (Aug 30, 2025)**:
- **URL Format Compatibility**: Enhanced password reset system to handle both URL formats
  - **Fixed Email Service** (`server/services/emailService.ts:48`): Corrected reset URL generation to use path parameters (`/reset-password/{token}`) instead of query parameters
  - **Added Routing Support** (`client/src/App.tsx:21`): Added fallback route `<Route path="/reset-password" component={ResetPassword} />` for query parameter compatibility
  - **Enhanced ResetPasswordForm** (`client/src/components/auth/ResetPasswordForm.tsx:41-42`): Added query parameter extraction fallback using `URLSearchParams` for backward compatibility
  - **Flexible Token Extraction**: System now supports both path parameters (`/reset-password/TOKEN`) and query parameters (`/reset-password?token=TOKEN`)
- **Email Template Improvements**: Enhanced button styling with `!important` declarations to ensure proper color rendering across email clients
- **Development Server Configuration**: Verified APP_URL configuration for proper email link generation in development environment

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
- **Password Recovery**: Enterprise-ready system with email delivery, security monitoring, and automated maintenance
- **Security Monitoring**: Real-time security event logging with IP tracking and severity classification
- **Token Management**: Automated cleanup scheduling with graceful shutdown handling