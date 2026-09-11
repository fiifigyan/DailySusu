import { createClient } from 'redis';
import { environment } from './environment';
import { logger } from '../utils/logger';

/**
 * Redis Client Configuration
 * Used for:
 * - Rate limiting
 * - Session management
 * - Firewall IP blocking
 * - Cache storage
 * - Failed request tracking
 */

const redisClient = createClient({
  url: environment.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('❌ Redis max retries reached (10 attempts)');
        return new Error('Redis max retries reached');
      }
      // Exponential backoff: 100ms, 200ms, 300ms, etc.
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 10000,
    keepAlive: 5000,
  },
});

// Event handlers
redisClient.on('error', (err) => {
  logger.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('🔌 Redis ready for commands');
});

redisClient.on('reconnecting', () => {
  logger.warn('🔄 Redis reconnecting...');
});

redisClient.on('end', () => {
  logger.warn('🔌 Redis connection closed');
});

/**
 * Connect to Redis
 * Called during server startup
 */
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info('✅ Redis connection established');
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    // Don't exit process - Redis may be optional in development
    if (environment.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️ Continuing without Redis (development mode)');
    }
  }
}

/**
 * Gracefully disconnect from Redis
 * Called during server shutdown
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('✅ Redis disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

/**
 * Helper: Set a key with expiration
 */
export async function setWithExpiry(
  key: string,
  value: string,
  expirySeconds: number
): Promise<void> {
  await redisClient.set(key, value, { EX: expirySeconds });
}

/**
 * Helper: Get a key
 */
export async function getKey(key: string): Promise<string | null> {
  return await redisClient.get(key);
}

/**
 * Helper: Delete a key
 */
export async function deleteKey(key: string): Promise<void> {
  await redisClient.del(key);
}

/**
 * Helper: Increment a counter with expiry
 */
export async function incrementWithExpiry(
  key: string,
  expirySeconds: number
): Promise<number> {
  const count = await redisClient.incr(key);
  
  if (count === 1) {
    await redisClient.expire(key, expirySeconds);
  }
  
  return count;
}

/**
 * Helper: Check if key exists
 */
export async function keyExists(key: string): Promise<boolean> {
  return await redisClient.exists(key) > 0;
}

/**
 * Helper: Get remaining TTL
 */
export async function getTTL(key: string): Promise<number> {
  return await redisClient.ttl(key);
}

export { redisClient };