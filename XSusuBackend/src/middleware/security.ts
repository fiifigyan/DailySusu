import { Request, Response, NextFunction } from 'express';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Security Middleware
 * 
 * Handles:
 * - Request sanitization (NoSQL injection prevention)
 * - Content-Type validation
 * - Response time tracking
 * - Security header enforcement
 * - Request body size validation
 */

export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // ============================================
  // 1. Content-Type Validation
  // ============================================
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn(`Unsupported content type: ${contentType} from ${req.ip}`);
      res.status(415).json({
        success: false,
        message: 'Unsupported Media Type. Use application/json',
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
      return;
    }
  }

  // ============================================
  // 2. Request Body Sanitization
  // ============================================
  if (req.body) {
    sanitizeObject(req.body);
  }

  if (req.query) {
    sanitizeObject(req.query);
  }

  if (req.params) {
    sanitizeObject(req.params);
  }

  // ============================================
  // 3. Header Sanitization
  // ============================================
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-requested-with',
    'x-http-method-override',
    'x-rewrite-url',
  ];

  for (const header of suspiciousHeaders) {
    const value = req.headers[header];
    if (value && typeof value === 'string' && value.length > 200) {
      logger.warn(`Suspicious header detected: ${header} from ${req.ip}`);
      res.status(400).json({
        success: false,
        message: 'Bad Request',
        code: 'SUSPICIOUS_HEADER',
      });
      return;
    }
  }

  // ============================================
  // 4. Request Timestamp
  // ============================================
  (req as any).requestTime = Date.now();
  (req as any).requestId = generateRequestId();

  // ============================================
  // 5. Response Security Headers
  // ============================================
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.removeHeader('Via');

  // ============================================
  // 6. Response Time Tracking
  // ============================================
  const originalSend = res.send;
  res.send = function (body: any) {
    const responseTime = Date.now() - ((req as any).requestTime || Date.now());
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Request-ID', (req as any).requestId);

    // Log slow requests (>5 seconds)
    if (responseTime > 5000) {
      logger.warn(`Slow request: ${req.method} ${req.path} - ${responseTime}ms from ${req.ip}`);
    }

    // Log very slow requests (>10 seconds)
    if (responseTime > 10000) {
      logger.error(`Very slow request: ${req.method} ${req.path} - ${responseTime}ms from ${req.ip}`);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Recursively sanitize object to prevent NoSQL injection
 * Removes MongoDB/NoSQL operators ($set, $gt, etc.)
 */
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];

    // Remove NoSQL injection operators
    if (typeof key === 'string' && (key.startsWith('$') || key.includes('.'))) {
      delete obj[key];
      logger.warn(`NoSQL operator removed: ${key}`);
      continue;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      // Remove null bytes
      obj[key] = value.replace(/\0/g, '');

      // Remove control characters
      obj[key] = obj[key].replace(/[\x00-\x1F\x7F]/g, '');

      // Trim to max length
      if (value.length > 10000) {
        obj[key] = value.substring(0, 10000);
        logger.warn(`String truncated to 10000 characters: ${key}`);
      }
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitizeObject(value);
    }

    // Sanitize arrays
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          sanitizeObject(item);
        }
      });
    }
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}