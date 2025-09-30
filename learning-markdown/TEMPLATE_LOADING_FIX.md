# Template Loading Fix for Guest Users

## Date: January 3, 2025

## Issue Summary
The Quick Start Template dropdown was not appearing for unauthenticated (guest) users on the production Vercel deployment. Additionally, the sign-in button was slow to load due to blocking authentication checks.

## Root Cause Analysis

### The Problem
1. **Authentication-gated endpoints**: The `/api/templates` endpoint was making authentication checks that failed for guest users
2. **Client-side error handling**: The client treated 401 responses as errors, causing the auth check to fail and preventing template loading
3. **Blocking UI**: The sign-in button waited for authentication checks to complete before rendering

### Console Errors Observed
```
Failed to load resource: the server responded with a status of 401 ()
Auth check failed: Error: Authentication failed: {"error":"Not authenticated","message":"No active session"}
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
api/auth/login:1  Failed to load resource: the server responded with a status of 401 ()
```

## Changes Made

### 1. Server-Side Changes

#### Before: Templates Endpoint Required User Context Validation
**File**: `server/routes.ts`
```javascript
// Old implementation - lines 76-92
app.get("/api/templates", extractUserId, validateUserContext, async (req, res) => {
  try {
    // Set no-cache headers
    res.set({...});
    
    const userStorage = createStorage(req.userId); // Could be undefined for guests
    const templates = await userStorage.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});
```

#### After: Templates Endpoint Works for Both Guests and Users
**File**: `server/routes.ts`
```javascript
// New implementation - lines 76-112
// Added public default templates endpoint
app.get("/api/templates/default", async (_req, res) => {
  try {
    const defaultTemplates = await templateManagementService.getDefaultTemplates();
    res.json(defaultTemplates);
  } catch (error) {
    console.error('Error fetching default templates:', error);
    res.status(500).json({ message: "Failed to fetch default templates" });
  }
});

// Made main templates endpoint auth-optional
app.get("/api/templates", extractUserId, async (req, res) => {
  try {
    // Set no-cache headers
    res.set({...});
    
    // Always return default templates
    const defaultTemplates = await templateManagementService.getDefaultTemplates();
    
    if (req.userId) {
      // Authenticated user - return defaults + user templates
      const userTemplates = await templateManagementService.getUserTemplates(req.userId);
      res.json([...defaultTemplates, ...userTemplates]);
    } else {
      // Guest user - return only defaults
      res.json(defaultTemplates);
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});
```

#### Added Lightweight Session Check Endpoint
**File**: `server/routes/auth.ts`
```javascript
// New endpoint - lines 36-49
router.get('/me', (req: Request, res: Response) => {
  if (req.user) {
    // User is authenticated
    res.json({
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
    });
  } else {
    // Guest user - return 401 but don't throw
    res.status(401).json({ message: 'Not authenticated' });
  }
});
```

#### Added Template Management Service Methods
**File**: `server/services/templateManagementService.ts`
```javascript
// New method - lines 124-137
async getDefaultTemplates(): Promise<Template[]> {
  try {
    const result = await this.db
      .select()
      .from(templates)
      .where(eq(templates.isDefault, true))
      .orderBy(templates.type);
    
    return result;
  } catch (error) {
    console.error('Error fetching default templates:', error);
    return [];
  }
}
```

### 2. Client-Side Changes

#### Before: Auth Check Threw Errors on 401
**File**: `client/src/lib/api.ts`
```javascript
// Old implementation - lines 90-93
export async function getCurrentUser() {
  const response = await apiRequest("GET", "/api/auth/me");
  return response.json();
}
```

#### After: Auth Check Handles 401 Gracefully
**File**: `client/src/lib/api.ts`
```javascript
// New implementation - lines 90-101
export async function getCurrentUser() {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  } catch (error: any) {
    // 401 is expected for guest users - return null instead of throwing
    if (error.message?.includes('401') || error.message?.includes('Authentication failed')) {
      return { user: null };
    }
    throw error;
  }
}
```

#### Before: AuthContext Logged Auth Failures as Errors
**File**: `client/src/context/AuthContext.tsx`
```javascript
// Old implementation - lines 65-87
const authOperation = async () => {
  setAuthOperationInProgress(true);
  try {
    const data = await getCurrentUser();
    setUser(data.user);
    
    if (data.user) {
      // Fetch API keys...
    } else {
      setApiKeys([]);
    }
  } catch (error) {
    console.error('Auth check failed:', error);  // Treated 401 as error
    setUser(null);
    setApiKeys([]);
  } finally {
    setLoading(false);
    setAuthOperationInProgress(false);
  }
};
```

#### After: AuthContext Treats Guest State as Normal
**File**: `client/src/context/AuthContext.tsx`
```javascript
// New implementation - lines 65-91
const authOperation = async () => {
  setAuthOperationInProgress(true);
  try {
    const data = await getCurrentUser();
    
    if (data.user) {
      setUser(data.user);
      // Fetch API keys...
    } else {
      // Guest user - this is normal, not an error
      setUser(null);
      setApiKeys([]);
    }
  } catch (error) {
    // Only log unexpected errors
    console.error('Unexpected auth error:', error);
    setUser(null);
    setApiKeys([]);
  } finally {
    setLoading(false);
    setAuthOperationInProgress(false);
  }
};
```

#### Before: Sign-In Button Blocked by Loading State
**File**: `client/src/pages/home.tsx`
```javascript
// Old implementation - lines 180-199
{/* Authentication UI */}
{loading ? (
  <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
) : user ? (
  <div className="flex items-center space-x-3">
    <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
      {user.email}
    </span>
    <SettingsDropdown />
  </div>
) : (
  <Button onClick={() => setShowAuthModal(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
    <LogIn className="h-4 w-4 mr-2" />
    Sign In
  </Button>
)}
```

#### After: Sign-In Button Renders Immediately
**File**: `client/src/pages/home.tsx`
```javascript
// New implementation - lines 180-198
{/* Authentication UI - Render sign-in immediately, don't wait for auth check */}
{user ? (
  <div className="flex items-center space-x-3">
    <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
      {user.email}
    </span>
    <SettingsDropdown />
  </div>
) : (
  <Button 
    onClick={() => setShowAuthModal(true)}
    size="sm"
    className="bg-blue-600 hover:bg-blue-700 text-white"
    disabled={loading}  // Just disable during loading, don't hide
  >
    <LogIn className="h-4 w-4 mr-2" />
    Sign In
  </Button>
)}
```

### 3. Database Changes

#### Added Partial Unique Index for Default Templates
**File**: `migrations/2025-01-03_add_default_template_unique_index.sql`
```sql
-- Add partial unique index for default templates
-- This ensures we don't create duplicate default templates with the same name
-- The index only applies to rows where is_default = true AND user_id IS NULL

CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_name 
ON templates (name) 
WHERE is_default = true AND user_id IS NULL;

-- Also add an index for template type to ensure unique default templates per type
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_type 
ON templates (type) 
WHERE is_default = true AND user_id IS NULL;
```

#### Improved Template Initialization
**File**: `server/services/templateManagementService.ts`
```javascript
// Updated implementation - lines 32-53
async initializeDefaultTemplates(): Promise<void> {
  try {
    const defaultTemplates = await this.templateService.getDefaultTemplates();
    
    await this.db.transaction(async (tx) => {
      for (const template of defaultTemplates) {
        await tx
          .insert(templates)
          .values({
            ...template,
            isDefault: true,  // Explicitly set
            userId: null      // Explicitly set
          })
          .onConflictDoNothing();  // Now works with unique index
      }
    });
    console.log('Default templates initialization completed');
  } catch (error) {
    console.error('Error initializing default templates:', error);
    // Don't throw - allow app to continue even if templates fail to initialize
  }
}
```

## Results

### Before
- ❌ Guest users saw no Quick Start Template dropdown
- ❌ Console showed repeated 401 authentication errors
- ❌ Sign-in button had a loading skeleton that delayed its appearance
- ❌ Template initialization could fail silently with duplicate entries

### After
- ✅ Guest users see Quick Start Template dropdown with default templates
- ✅ Authentication checks handle 401s gracefully for guest users
- ✅ Sign-in button appears immediately (just disabled during auth check)
- ✅ Template initialization is idempotent with proper unique constraints
- ✅ Public `/api/templates/default` endpoint available for guaranteed guest access
- ✅ Main `/api/templates` endpoint works for both guests and authenticated users

## Testing Verification

### API Endpoints
```bash
# Test templates endpoint for guest users
curl http://localhost:5001/api/templates
# Returns: [{"id":"...", "name":"Coding", "isDefault":true, ...}, ...]

# Test default templates endpoint
curl http://localhost:5001/api/templates/default
# Returns: [{"id":"...", "name":"Coding", "isDefault":true, ...}, ...]

# Test session check endpoint
curl http://localhost:5001/api/auth/me
# Returns: 401 {"message": "Not authenticated"} for guests
```

### Type Checking
```bash
npm run check
# ✓ No TypeScript errors
```

## Deployment Notes

1. Apply the database migration to add unique indexes
2. Ensure `templateManagementService` is imported in `server/routes.ts`
3. The changes are backward compatible - existing authenticated flows remain unchanged
4. The public endpoints don't expose any sensitive data (only default templates)

## Impact

This fix ensures that the PromptSculptor demo experience works properly for unauthenticated users, allowing them to explore the application's template functionality before signing up. The performance improvements also make the UI more responsive by eliminating unnecessary blocking operations.