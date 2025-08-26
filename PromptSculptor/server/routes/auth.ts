import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { DatabaseStorage } from '../databaseStorage';
import { z } from 'zod';
import { sanitizeInput } from '../utils/sanitizer';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate and sanitize input
    const { email, password } = registerSchema.parse(req.body);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    
    const dbStorage = new DatabaseStorage();
    
    // Check if user already exists
    const existingUser = await dbStorage.getUserByEmail(sanitizedEmail);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Create new user
    const user = await dbStorage.createUser(sanitizedEmail, password);
    
    // Log the user in automatically after registration
    req.login({ id: user.id, email: user.email }, (err) => {
      if (err) {
        console.error('Auto-login failed after registration:', err);
        return res.status(201).json({ 
          message: 'User created successfully. Please log in.',
          userId: user.id
        });
      }
      
      res.status(201).json({ 
        message: 'User created and logged in successfully',
        user: { id: user.id, email: user.email }
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    loginSchema.parse(req.body);
    
    passport.authenticate('local', (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ 
          error: 'Authentication failed',
          message: 'An error occurred during authentication'
        });
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: info?.message || 'Invalid email or password'
        });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ 
            error: 'Login failed',
            message: 'Failed to establish session'
          });
        }
        
        res.json({ 
          message: 'Login successful',
          user: { id: user.id, email: user.email }
        });
      });
    })(req, res, next);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors
      });
    }
    next(error);
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
    
    // Destroy session
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destruction error:', destroyErr);
      }
      
      res.json({ message: 'Logout successful' });
    });
  });
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      message: 'No active session'
    });
  }
  
  res.json({ 
    user: { 
      id: req.user.id, 
      email: req.user.email 
    }
  });
});

// API Key management routes
router.post('/api-keys', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to manage API keys'
    });
  }
  
  try {
    const { service, apiKey, keyName } = req.body;
    
    if (!service || !apiKey) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Service and API key are required'
      });
    }
    
    const dbStorage = new DatabaseStorage(req.user.id);
    
    // Check if key already exists for this service
    const existingKey = await dbStorage.getUserApiKey(req.user.id, service);
    if (existingKey) {
      return res.status(409).json({ 
        error: 'Key exists',
        message: `An API key for ${service} already exists`
      });
    }
    
    const savedKey = await dbStorage.createUserApiKey(
      req.user.id, 
      service, 
      apiKey, 
      keyName
    );
    
    res.status(201).json({ 
      message: 'API key saved successfully',
      key: {
        id: savedKey.id,
        service: savedKey.service,
        keyName: savedKey.keyName,
        createdAt: savedKey.createdAt
      }
    });
  } catch (error) {
    console.error('API key creation error:', error);
    res.status(500).json({ 
      error: 'Failed to save API key',
      message: 'An error occurred while saving the API key'
    });
  }
});

// Get user's API keys
router.get('/api-keys', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to view API keys'
    });
  }
  
  try {
    const dbStorage = new DatabaseStorage(req.user.id);
    const keys = await dbStorage.getUserApiKeys(req.user.id);
    
    // Don't send encrypted keys to client, only metadata
    const sanitizedKeys = keys.map(key => ({
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      createdAt: key.createdAt
    }));
    
    res.json({ keys: sanitizedKeys });
  } catch (error) {
    console.error('API key retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve API keys',
      message: 'An error occurred while fetching API keys'
    });
  }
});

// Delete API key
router.delete('/api-keys/:keyId', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to delete API keys'
    });
  }
  
  try {
    const dbStorage = new DatabaseStorage(req.user.id);
    const deleted = await dbStorage.deleteUserApiKey(req.user.id, req.params.keyId);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Key not found',
        message: 'API key not found or access denied'
      });
    }
    
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('API key deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete API key',
      message: 'An error occurred while deleting the API key'
    });
  }
});

export default router;