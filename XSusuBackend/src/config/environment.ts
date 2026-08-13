import dotenv from 'dotenv';
dotenv.config();

export const environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/xsusu',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  
  // Security
  BCRYPT_SALT_ROUNDS: 12,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '32-byte-encryption-key-here!!',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:19000,exp://').split(','),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX: 5, // 5 attempts per window
  
  // API
  API_URL: process.env.API_URL || 'http://localhost:3000',
  
  // Firebase Cloud Messaging
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY || '',
  
  // SMS (for OTP)
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'XSusu',
};