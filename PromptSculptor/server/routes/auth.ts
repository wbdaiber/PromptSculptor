import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { DatabaseStorage } from '../databaseStorage.js';
import { z } from 'zod';
import { sanitizeInput } from '../utils/sanitizer.js';
import { UserApiKeyManager } from '../services/userApiKeyManager.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';
import { generateResetToken, hashToken } from '../services/tokenService.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../../shared/schema.js';
import { cacheInvalidationService } from '../services/cacheInvalidationService.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// Lightweight session check endpoint (for guests and users)
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

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate and sanitize input
    const { username, email, password } = registerSchema.parse(req.body);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedUsername = sanitizeInput(username);
    
    const dbStorage = new DatabaseStorage();
    
    // Check if user already exists by email
    const existingUserByEmail = await dbStorage.getUserByEmail(sanitizedEmail);
    if (existingUserByEmail) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Check if username is already taken
    const existingUserByUsername = await dbStorage.getUserByUsername(sanitizedUsername);
    if (existingUserByUsername) {
      return res.status(409).json({ 
        error: 'Username taken',
        message: 'This username is already taken'
      });
    }
    
    // Create new user
    const user = await dbStorage.createUser(sanitizedUsername, sanitizedEmail, password);
    
    // Invalidate caches after user creation
    cacheInvalidationService.onUserCreated(user.id);
    
    // Send welcome email (non-blocking - registration succeeds even if email fails)
    try {
      const emailResult = await sendWelcomeEmail({
        email: user.email,
        userName: user.username
      });
      
      if (emailResult.success) {
        console.log(`✅ Welcome email sent to new user: ${user.email} (User ID: ${user.id})`);
      } else {
        console.error('⚠️ Welcome email failed but registration continued:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Welcome email error but registration continued:', emailError);
    }
    
    // Log the user in automatically after registration
    req.login({ id: user.id, username: user.username, email: user.email }, (err) => {
      if (err) {
        console.error('Auto-login failed after registration:', err);
        return res.status(201).json({ 
          message: 'User created successfully. Please log in.',
          userId: user.id
        });
      }
      
      res.status(201).json({ 
        message: 'User created and logged in successfully',
        user: { id: user.id, username: user.username, email: user.email }
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
          user: { id: user.id, username: user.username, email: user.email }
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
  // Clear user's API client cache before logout
  const userId = req.user?.id;
  if (userId) {
    UserApiKeyManager.clearUserCache(userId);
  }
  
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
      username: req.user.username,
      email: req.user.email 
    }
  });
});

// Change password
router.patch('/change-password', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to change password'
    });
  }
  
  try {
    // Validate and sanitize input
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const sanitizedCurrentPassword = sanitizeInput(currentPassword);
    const sanitizedNewPassword = sanitizeInput(newPassword);
    
    const dbStorage = new DatabaseStorage();
    
    // Update the password
    const success = await dbStorage.updateUserPassword(
      req.user.id, 
      sanitizedCurrentPassword, 
      sanitizedNewPassword
    );
    
    if (!success) {
      return res.status(400).json({ 
        error: 'Invalid current password',
        message: 'The current password you entered is incorrect'
      });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    console.error('Password change error:', error);
    res.status(500).json({ 
      error: 'Password change failed',
      message: 'An error occurred while changing the password'
    });
  }
});

// Delete account
router.delete('/account', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to delete your account'
    });
  }
  
  try {
    // Validate and sanitize input
    const { password } = deleteAccountSchema.parse(req.body);
    const sanitizedPassword = sanitizeInput(password);
    
    const dbStorage = new DatabaseStorage();
    
    // Delete the user account
    const success = await dbStorage.deleteUser(req.user.id, sanitizedPassword);
    
    if (!success) {
      return res.status(400).json({ 
        error: 'Invalid password',
        message: 'The password you entered is incorrect'
      });
    }
    
    // Clear user's API client cache before account deletion
    UserApiKeyManager.clearUserCache(req.user.id);
    
    // Invalidate all caches related to the deleted user
    cacheInvalidationService.onUserDeleted(req.user.id);
    
    // Log out the user and destroy session
    req.logout((err) => {
      if (err) {
        console.error('Logout error after account deletion:', err);
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destruction error after account deletion:', destroyErr);
        }
        
        res.json({ message: 'Account deleted successfully' });
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      error: 'Account deletion failed',
      message: 'An error occurred while deleting the account'
    });
  }
});

// Forgot password - request password reset email
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    // Validate and sanitize input
    const { email } = forgotPasswordSchema.parse(req.body);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    
    const dbStorage = new DatabaseStorage();
    
    // Look up user by email
    const user = await dbStorage.getUserByEmail(sanitizedEmail);
    
    // Always respond with success to prevent user enumeration
    // This prevents attackers from determining which emails exist in the system
    const standardResponse = {
      message: 'If an account with that email exists, we have sent you a password reset link.',
      instructions: 'Please check your email and follow the instructions to reset your password.'
    };
    
    // If user doesn't exist, still return success but don't send email
    if (!user) {
      console.info(`Password reset requested for non-existent email: ${sanitizedEmail}`);
      return res.json(standardResponse);
    }
    
    // Generate secure reset token
    const tokenData = generateResetToken(30); // 30 minutes expiry
    
    // Store hashed token in database
    try {
      await dbStorage.createPasswordResetToken({
        userId: user.id,
        token: tokenData.hashedToken,
        expiresAt: tokenData.expiresAt,
        used: false
      });
      
      // Invalidate security metrics cache after token creation
      cacheInvalidationService.onPasswordResetTokenChanged();
    } catch (dbError) {
      console.error('Database error creating password reset token:', dbError);
      return res.status(500).json({
        error: 'Service temporarily unavailable',
        message: 'Unable to process password reset request. Please try again later.'
      });
    }
    
    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail({
        email: user.email,
        resetToken: tokenData.token, // Send raw token, not hashed
        expiresAt: tokenData.expiresAt,
        userName: user.username
      });
      
      if (!emailResult.success) {
        console.error('Email service error:', emailResult.error);
        // Even if email fails, don't reveal this to prevent user enumeration
        // Log error for admin monitoring but return success to user
      }
      
      // Log successful password reset request for security monitoring
      console.info(`Password reset email sent to: ${user.email} (User ID: ${user.id})`);
      
    } catch (emailError) {
      console.error('Unexpected email error:', emailError);
      // Continue and return success to prevent user enumeration
    }
    
    res.json(standardResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid email address',
        message: 'Please provide a valid email address',
        details: error.errors
      });
    }
    
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Service temporarily unavailable',
      message: 'Unable to process password reset request. Please try again later.'
    });
  }
});

// Reset password - complete password reset with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate and sanitize input
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const sanitizedToken = sanitizeInput(token);
    const sanitizedNewPassword = sanitizeInput(newPassword);
    
    // Hash the token to match stored format
    const hashedToken = hashToken(sanitizedToken);
    
    const dbStorage = new DatabaseStorage();
    
    // Retrieve token from database
    const tokenRecord = await dbStorage.getPasswordResetToken(hashedToken);
    
    if (!tokenRecord) {
      console.warn(`Invalid password reset token attempted: ${sanitizedToken.substring(0, 10)}...`);
      return res.status(400).json({
        error: 'Invalid reset link',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }
    
    // Check if token is already used
    if (tokenRecord.used) {
      console.warn(`Used password reset token attempted: ${sanitizedToken.substring(0, 10)}... (User ID: ${tokenRecord.userId})`);
      return res.status(400).json({
        error: 'Reset link already used',
        message: 'This password reset link has already been used. Please request a new one if needed.'
      });
    }
    
    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      console.warn(`Expired password reset token attempted: ${sanitizedToken.substring(0, 10)}... (User ID: ${tokenRecord.userId})`);
      return res.status(400).json({
        error: 'Reset link expired',
        message: 'This password reset link has expired. Please request a new one.'
      });
    }
    
    // Mark token as used first (prevents race conditions)
    const tokenMarkedUsed = await dbStorage.markTokenAsUsed(tokenRecord.id);
    
    // Invalidate security metrics cache after token usage
    cacheInvalidationService.onPasswordResetTokenChanged();
    if (!tokenMarkedUsed) {
      console.error(`Failed to mark token as used: ${tokenRecord.id}`);
      return res.status(500).json({
        error: 'Reset failed',
        message: 'Unable to process password reset. Please try again.'
      });
    }
    
    // Update user password
    const passwordUpdated = await dbStorage.resetUserPassword(tokenRecord.userId, sanitizedNewPassword);
    if (!passwordUpdated) {
      console.error(`Failed to reset password for user: ${tokenRecord.userId}`);
      return res.status(500).json({
        error: 'Reset failed',
        message: 'Unable to update password. Please request a new reset link.'
      });
    }
    
    // Invalidate all other password reset tokens for this user (security measure)
    await dbStorage.invalidateUserTokens(tokenRecord.userId);
    
    // Clear user's API client cache (security measure)
    UserApiKeyManager.clearUserCache(tokenRecord.userId);
    
    // Log successful password reset for security monitoring
    console.info(`Password successfully reset for user ID: ${tokenRecord.userId}`);
    
    res.json({
      message: 'Password reset successful',
      instructions: 'Your password has been updated. You can now log in with your new password.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Please provide a valid reset token and password',
        details: error.errors
      });
    }
    
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Reset failed',
      message: 'Unable to process password reset. Please try again or request a new reset link.'
    });
  }
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
    
    // Invalidate caches after API key change
    cacheInvalidationService.onApiKeyChanged(req.user.id);
    
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
    
    // Invalidate caches after API key deletion
    cacheInvalidationService.onApiKeyChanged(req.user.id);
    
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