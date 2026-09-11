import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * RATE LIMITER MIDDLEWARE
 * 
 * Prevents abuse by limiting request frequency
 * Uses sliding window algorithm with Redis
 */

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests allowed in window
  keyPrefix: string;       // Redis key prefix
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).userId || 'anonymous';
    
    // Use combination of IP and user ID for authenticated users
    const identifier = userId !== 'anonymous' ? `${userId}` : clientIp;
    const key = `${config.keyPrefix}:${identifier}`;

    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Remove old entries outside the window
      await redisClient.zRemRangeByScore(key, 0, windowStart);

      // Count current requests in window
      const currentCount = await redisClient.zCard(key);

      if (currentCount >= config.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = await redisClient.zRange(key, 0, 0);
        const resetAt = oldestRequest.length > 0
          ? parseInt(oldestRequest[0].split(':')[1]) + config.windowMs
          : now + config.windowMs;
        
        const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);

        logger.warn(`Rate limit exceeded: ${identifier} - ${req.path} (${currentCount}/${config.maxRequests})`);

        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds,
        });
        return;
      }

      // Add current request to sorted set
      await redisClient.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
      await redisClient.expire(key, Math.ceil(config.windowMs / 1000));

      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + config.windowMs) / 1000));

      next();
    } catch (error) {
      // If Redis fails, allow the request (fail-open)
      logger.error('Rate limiter Redis error:', error);
      next();
    }
  };
}

// ============================================
// PREDEFINED RATE LIMITERS
// ============================================

/**
 * Global rate limiter - all endpoints
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: environment.RATE_LIMIT_WINDOW_MS,
  maxRequests: environment.RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: 'ratelimit:global',
});

/**
 * Auth rate limiter - login/register endpoints
 * 5 attempts per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: environment.AUTH_RATE_LIMIT_MAX,
  keyPrefix: 'ratelimit:auth',
});

/**
 * Contribution rate limiter - payment recording
 * 10 requests per minute per user
 */
export const contributionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:contribution',
});

/**
 * Payout rate limiter - completing payouts
 * 5 requests per minute per user
 */
export const payoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'ratelimit:payout',
});

/**
 * OTP rate limiter - OTP verification attempts
 * 3 attempts per 10 minutes per user
 */
export const otpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 3,
  keyPrefix: 'ratelimit:otp',
});

/**
 * Invite rate limiter - inviting members
 * 20 requests per hour per user
 */
export const inviteRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'ratelimit:invite',
});

/**
 * Get current rate limit status for an identifier
 * Useful for debugging and admin monitoring
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  await redisClient.zRemRangeByScore(key, 0, windowStart);
  const currentCount = await redisClient.zCard(key);
  const oldestRequest = await redisClient.zRange(key, 0, 0);
  
  const resetAt = oldestRequest.length > 0
    ? parseInt(oldestRequest[0].split(':')[0]) + config.windowMs
    : now + config.windowMs;

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - currentCount),
    resetAt,
    retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
  };
}