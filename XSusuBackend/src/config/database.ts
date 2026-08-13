import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

interface PrismaLogEvent {
  level: 'warn' | 'error';
  emit: 'event';
}

interface PrismaWarningEvent {
  message: string;
  timestamp: Date;
  [key: string]: unknown;
}

interface PrismaErrorEvent {
  message: string;
  timestamp: Date;
  [key: string]: unknown;
}

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e: PrismaWarningEvent): void => {
  logger.warn('Prisma Warning:', e);
});

prisma.$on('error', (e: PrismaErrorEvent): void => {
  logger.error('Prisma Error:', e);
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export { prisma };