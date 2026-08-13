import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { environment } from '../config/environment';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${config.keyPrefix}:${clientIp}`;
    
    try {
      const currentCount = await redisClient.incr(key);
      
      if (currentCount === 1) {
        await redisClient.expire(key, Math.ceil(config.windowMs / 1000));
      }
      
      const ttl = await redisClient.ttl(key);
      
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);
      
      if (currentCount > config.maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: ttl,
        });
        return;
      }
      
      next();
    } catch (error) {
      // If Redis fails, allow the request
      next();
    }
  };
}

export const globalRateLimiter = createRateLimiter({
  windowMs: environment.RATE_LIMIT_WINDOW_MS,
  maxRequests: environment.RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: 'ratelimit:global',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: environment.AUTH_RATE_LIMIT_MAX,
  keyPrefix: 'ratelimit:auth',
});

export const contributionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyPrefix: 'ratelimit:contribution',
});