import cron from 'node-cron';
import { prisma } from '../config/database';
import { paymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

/**
 * Retry failed disbursements every 30 minutes
 * Runs automatically in the background
 */
export function startRetryJob(): void {
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running failed disbursement retry...');
    
    const failedItems = await prisma.failedDisbursement.findMany({
      where: {
        resolved: false,
        retryCount: { lt: 3 },
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    for (const item of failedItems) {
      try {
        const result = await paymentService.bulkDisburse([{
          recipientCode: item.recipientPhone,
          amount: item.amount,
          reference: `RETRY-${item.id}-${Date.now()}`,
          reason: `Retry: ${item.description}`,
        }]);

        if (result.success) {
          await prisma.failedDisbursement.update({
            where: { id: item.id },
            data: { resolved: true, lastRetryAt: new Date() },
          });
          logger.info(`Retry successful for ${item.id}`);
        } else {
          await prisma.failedDisbursement.update({
            where: { id: item.id },
            data: {
              retryCount: item.retryCount + 1,
              lastRetryAt: new Date(),
            },
          });
          logger.warn(`Retry ${item.retryCount + 1} failed for ${item.id}`);
        }
      } catch (error) {
        logger.error(`Retry error for ${item.id}:`, error);
      }
    }
  });
}