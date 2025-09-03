
# PromptSculptor – Auth & Public Templates Fix (Exportable Implementation Guide)
**Date:** 2025-09-03 11:29:59
**Owner:** Brad Daymer  
**Goal:** Ensure the Quick Start Templates dropdown renders for **unsigned** users and improve Sign In button responsiveness by making auth checks tolerant and exposing a public templates endpoint.

---

## TL;DR (What to change)
1) **Expose public templates** at `/api/templates/public` via a mounted router (avoid path doubling).  
2) **Treat 401 as “guest”** in `AuthService.checkSession()`—do **not** throw.  
3) **Use leading slashes** on all client fetch calls (e.g., `/api/auth/login`).  
4) **Remove `Content-Type` on GETs** to avoid unnecessary preflights.  
5) **Ensure token is in user context** after login; don’t send `Authorization` with `undefined`.  
6) **Render guest-first in Header** so Sign In isn’t gated by a session check.  
7) **Add `handleTemplateSelect`** in the dropdown component if missing (prevent render errors).  
8) **Keep global auth middleware off public routes** (route-level protection only).

---

## Symptoms & Evidence
- Public demo screen shows **no Quick Start Template dropdown** for unsigned users.
- Console shows:
  - `Auth check failed: Error: Authentication failed: {"error":"Not authenticated","message":"No active session"}`
  - `api/auth/login:1 Failed to load resource: the server responded with a status of 401 ()`
  - `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`
- Sign In button appears **slow** (likely session check + serverless cold starts).

---

## Likely Root Causes
- **Router path/mount mismatch** → Public templates route never hit.  
- **401 treated as error** → UI bails early and never renders templates for guests.  
- **Relative fetch URLs** (missing leading `/`) → unstable resolution / 401s.  
- **Token propagation mismatch** (`data.token` saved, but `user.token` is undefined) → authenticated fetches fail.  
- **GET with `Content-Type`** triggers preflight and slows things down.  
- **Header gated on `loading`** → Sign In button feels late to appear.

---

## Step-by-Step Changes

### 1) **Templates Router** (make routes relative to mount)
**File:** `server/routes/templates.ts`
```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// import your db + schema: db, templates, and, eq, isNull

const templatesRouter = Router();

// PUBLIC → GET /api/templates/public
templatesRouter.get('/public', async (req, res) => {
  try {
    const defaultTemplates = await db
      .select()
      .from(templates)
      .where(and(eq(templates.isDefault, true), isNull(templates.userId)));

    res.json({ success: true, templates: defaultTemplates });
  } catch (error) {
    console.error('Error fetching public templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// PROTECTED → GET /api/templates/user
templatesRouter.get('/user', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId));

    res.json({ success: true, templates: userTemplates });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user templates' });
  }
});

export default templatesRouter;
```

### 2) **Mount the Router and Provide a Clean Session Route**
**File:** `server/index.ts`
```ts
import express from 'express';
import templatesRouter from './routes/templates';
import { optionalAuth } from './middleware/auth';
import { initializeDefaultTemplates } from './services/templateService';

const app = express();
app.use(express.json());

// Mount routers cleanly (no global auth before)
app.use('/api/templates', templatesRouter);

// Minimal session endpoint: 200 if user, 401 if guest (expected)
app.get('/api/auth/session', optionalAuth, (req: any, res) => {
  if (req.user) return res.json({ user: req.user });
  return res.status(401).json({ error: 'Not authenticated', message: 'No active session' });
});

async function startServer() {
  try {
    await initializeDefaultTemplates();
    console.log('Default templates initialized');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

### 3) **Auth Middleware (route-level)**
**File:** `server/middleware/auth.ts`
```ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated', message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authenticated', message: 'Invalid token' });
  }
};

export const optionalAuth = (req: Request & { user?: any }, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      req.user = null; // invalid token → continue as guest
    }
  } else {
    req.user = null;
  }
  next();
};
```

### 4) **Auth Service: treat 401 as guest**
**File:** `client/services/authService.ts`
```ts
export class AuthService {
  private token: string | null = null;

  async checkSession(): Promise<{ authenticated: boolean; user?: User }> {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: { 'Authorization': this.token ? `Bearer ${this.token}` : '' }
      });

      if (res.ok) {
        const data = await res.json();
        return { authenticated: true, user: data.user };
      }
      if (res.status === 401) {
        // ✅ Expected for guests
        console.log('No active session - continuing as guest');
        return { authenticated: false };
      }
      throw new Error(`Unexpected response: ${res.status}`);
    } catch (err) {
      console.error('Session check error:', err);
      return { authenticated: false }; // ✅ do not throw
    }
  }

  async login(credentials: LoginCredentials) {
    const res = await fetch('/api/auth/login', { // ✅ leading slash
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    this.token = data.token;
    return data; // { token, user }
  }

  getToken() { return this.token; }
}
```

### 5) **Auth Context: guest-first render + store token on user**
**File:** `client/contexts/AuthContext.tsx`
```tsx
const authService = new AuthService();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Do not block UI; render as guest and upgrade later
    (async () => {
      const result = await authService.checkSession();
      if (result.authenticated && result.user) {
        setUser(result.user as any);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    })();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const data = await authService.login(credentials);
    // ✅ ensure token is available to callers that use user.token
    setUser({ ...(data.user || {}), token: data.token } as any);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // implement server logout if needed, but clear client-side at least
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Header example (guest-first)
function Header() {
  const { user } = useAuth();
  return (
    <header>
      <h1>PromptSculptor</h1>
      <div className="auth-section">
        {user ? <UserMenu user={user} /> : <SignInButton />}
      </div>
    </header>
  );
}
```

### 6) **QuickStartTemplates: correct fetch + no CT on GET + safe handler**
**File:** `client/components/QuickStartTemplates.tsx`
```tsx
export function QuickStartTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, [isAuthenticated]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);

      // ✅ public endpoint - no Content-Type header on GET
      const res = await fetch('/api/templates/public');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      let merged = data.templates || [];

      if (isAuthenticated && user?.token) {
        try {
          const userRes = await fetch('/api/templates/user', {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            merged = [...merged, ...(userData.templates || [])];
          }
        } catch (e) {
          console.error('Failed to fetch user templates:', e);
        }
      }

      setTemplates(merged);
    } catch (e) {
      console.error('Error loading templates:', e);
      setTemplates([{
        id: 'fallback',
        name: 'Basic Prompt',
        content: 'You are a helpful assistant.',
        description: 'Fallback template'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      // TODO: load template into editor state
      // setEditorContent(tpl.content);
    }
  };

  if (loading) {
    return (
      <div className="template-dropdown">
        <div className="animate-pulse bg-gray-200 h-10 rounded" />
      </div>
    );
  }

  return (
    <div className="template-dropdown">
      <label className="block text-sm font-medium mb-2">
        Quick Start Templates
      </label>
      <select className="w-full p-2 border rounded-md" onChange={(e) => handleTemplateSelect(e.target.value)}>
        <option value="">Select a template...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
```

### 7) **A11y:** Add dialog labels (not a blocker)
- Add `aria-label` or `aria-labelledby`/`aria-describedby` props to your `DialogContent`.

---

## Sanity Test Plan (5 minutes)

### Public (no login)
- `curl -i https://<your-app>.vercel.app/api/templates/public` → **200** JSON list.
- In an incognito browser:
  - Network shows `/api/auth/session` → **401** once (expected).  
  - Network shows `/api/templates/public` → **200**.  
  - Dropdown displays default templates.

### After Login
- Login → Network shows `/api/auth/login` → **200**.  
- Verify the app sends `Authorization: Bearer <token>` for `/api/templates/user`.  
- Dropdown now merges user templates with defaults.

### Headers & Preflight
- Confirm **no `Content-Type`** on GET `/api/templates/public` request.  
- Confirm **leading slash** on all `fetch` URLs.

### Sign In UX
- Header should render **Sign In** immediately; no skeleton gating.

---

## Rollback Plan
1) Revert only router mount + route changes if necessary (keep guest-first session handling—it’s safe).  
2) Revert client-side “guest-first” rendering if product requires skeleton, but performance will regress.

---

## Notes on Vercel
- First call to serverless routes can cold-start (300–1500ms). Rendering Sign In guest-first hides this delay.  
- Consider enabling Vercel’s Edge/ISR for public templates if data is static.

---

## Quick Troubleshooting Checklist
- [ ] `GET /api/templates/public` returns **200** in production.  
- [ ] `AuthService.checkSession()` returns `{ authenticated: false }` for 401.  
- [ ] All fetches use **leading slash**.  
- [ ] No `Content-Type` header on **GET** requests.  
- [ ] `user.token` exists post-login (or use `authService.getToken()`).  
- [ ] No global `requireAuth` before mounting the templates router.  
- [ ] Dropdown’s `handleTemplateSelect` defined.  
- [ ] `DialogContent` has accessible labeling.

---

## “Pasteable” Unified Diffs (Optional)
> Use these if your workflow prefers patch-style application. Adjust paths as needed.

```diff
--- a/server/routes/templates.ts
+++ b/server/routes/templates.ts
@@
-import express from 'express';
-import { requireAuth } from '../middleware/auth';
-const router = express.Router();
+import { Router } from 'express';
+import { requireAuth } from '../middleware/auth';
+const templatesRouter = Router();
@@
-router.get('/api/templates/public', async (req, res) => {
+templatesRouter.get('/public', async (req, res) => {
@@
-router.get('/api/templates/user', requireAuth, async (req, res) => {
+templatesRouter.get('/user', requireAuth, async (req, res) => {
@@
-export default router;
+export default templatesRouter;
```

```diff
--- a/server/index.ts
+++ b/server/index.ts
@@
-import express from 'express';
-import { initializeDefaultTemplates } from './services/templateService';
+import express from 'express';
+import templatesRouter from './routes/templates';
+import { optionalAuth } from './middleware/auth';
+import { initializeDefaultTemplates } from './services/templateService';
@@
-const app = express();
+const app = express();
 app.use(express.json());
+app.use('/api/templates', templatesRouter);
+app.get('/api/auth/session', optionalAuth, (req: any, res) => {
+  if (req.user) return res.json({ user: req.user });
+  return res.status(401).json({ error: 'Not authenticated', message: 'No active session' });
+});
```

```diff
--- a/client/services/authService.ts
+++ b/client/services/authService.ts
@@
-      if (response.ok) { ... }
-      if (response.status === 401) throw new Error('Not authenticated');
+      if (response.ok) { ... }
+      if (response.status === 401) return { authenticated: false };
@@
-    if (!response.ok) throw new Error('Login failed');
+    if (!response.ok) throw new Error('Login failed');
```

```diff
--- a/client/contexts/AuthContext.tsx
+++ b/client/contexts/AuthContext.tsx
@@
-  const [loading, setLoading] = useState(true);
+  // render guest-first; no blocking loading flag
@@
-  const login = async (credentials: LoginCredentials) => {
-    const data = await authService.login(credentials);
-    setUser(data.user);
-    setIsAuthenticated(true);
-  };
+  const login = async (credentials: LoginCredentials) => {
+    const data = await authService.login(credentials);
+    setUser({ ...(data.user || {}), token: data.token } as any);
+    setIsAuthenticated(true);
+  };
```

```diff
--- a/client/components/QuickStartTemplates.tsx
+++ b/client/components/QuickStartTemplates.tsx
@@
-      const response = await fetch('/api/templates/public', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
+      const response = await fetch('/api/templates/public');
@@
-          const userResponse = await fetch('/api/templates/user', { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` } });
+          const userResponse = await fetch('/api/templates/user', { headers: { 'Authorization': `Bearer ${user.token}` } });
@@
-  // ensure handleTemplateSelect exists
+  const handleTemplateSelect = (id: string) => { /* ... */ };
```

---

**End of Guide**  
This document is ready to share with your team or paste into a code assistant.
