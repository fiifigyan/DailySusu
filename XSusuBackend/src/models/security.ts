import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Sanitize request body against NoSQL injection
  if (req.body) {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    sanitizeObject(req.query);
  }

  // Validate content type
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      res.status(415).json({
        success: false,
        message: 'Unsupported Media Type',
      });
      return;
    }
  }

  // Add request timestamp
  (req as any).requestTime = Date.now();

  // Track response time
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - (req as any).requestTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    if (responseTime > 5000) {
      logger.warn(`Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    return originalSend.call(this, body);
  };

  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      // Remove MongoDB operators ($set, $gt, etc.)
      if (typeof key === 'string' && key.startsWith('$')) {
        delete obj[key];
        continue;
      }
      
      // Sanitize string values
      if (typeof value === 'string') {
        // Remove null bytes
        obj[key] = value.replace(/\0/g, '');
        
        // Trim excessively long strings
        if (value.length > 5000) {
          obj[key] = value.substring(0, 5000);
        }
      }
      
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}