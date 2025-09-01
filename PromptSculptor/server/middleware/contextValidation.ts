import { Request, Response, NextFunction } from 'express';

interface RequestWithContext extends Request {
  userId?: string;
  contextTimestamp?: number;
  user?: any;
}

export function validateUserContext(req: RequestWithContext, res: Response, next: NextFunction) {
  const userId = req.userId;
  const sessionUserId = req.user?.id;
  
  // Ensure user context consistency
  if (userId && sessionUserId && userId !== sessionUserId) {
    console.warn(`User context mismatch detected: userId=${userId} vs sessionUserId=${sessionUserId} for session ${req.sessionID}`);
    req.userId = sessionUserId; // Use session as source of truth
  }
  
  // Add request timestamp for race condition detection
  req.contextTimestamp = Date.now();
  
  // Log context validation for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Context validation - Session: ${req.sessionID}, UserId: ${req.userId}, Authenticated: ${!!req.user}, Timestamp: ${req.contextTimestamp}`);
  }
  
  next();
}

export function validateAuthenticatedContext(req: RequestWithContext, res: Response, next: NextFunction) {
  // First validate user context
  validateUserContext(req, res, () => {
    // Then ensure user is authenticated
    if (!req.user || !req.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        timestamp: req.contextTimestamp 
      });
    }
    
    // Additional consistency check for critical operations
    if (req.user.id !== req.userId) {
      console.error(`Critical context mismatch after validation: ${req.user.id} vs ${req.userId}`);
      return res.status(500).json({ 
        error: 'Authentication context error',
        timestamp: req.contextTimestamp 
      });
    }
    
    next();
  });
}