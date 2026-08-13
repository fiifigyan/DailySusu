import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { paymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const router = Router();

router.post('/paystack', async (req: Request, res: Response) => {
  try {
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers['x-paystack-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      const isValid = paymentService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const event = req.body;

    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulCharge(event.data);
        break;
      case 'transfer.success':
        logger.info(`Transfer successful: ${event.data.reference}`);
        break;
      case 'transfer.failed':
        await handleFailedTransfer(event.data);
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleSuccessfulCharge(data: any) {
  const { reference, authorization, metadata } = data;
  
  const contribution = await prisma.contribution.findFirst({
    where: { transactionRef: reference },
  });

  if (contribution) {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });

    // Save authorization for future auto-charges
    if (authorization?.authorization_code) {
      await prisma.user.update({
        where: { id: contribution.userId },
        data: { paystackAuthorizationCode: authorization.authorization_code },
      });
    }
  }
}

async function handleFailedTransfer(data: any) {
  logger.error(`Transfer failed: ${data.reference} - ${data.reason}`);
  
  await prisma.failedDisbursement.create({
    data: {
      groupId: data.metadata?.groupId || '',
      payoutId: data.metadata?.payoutId || '',
      recipientPhone: data.recipient || '',
      amount: data.amount / 100,
      description: data.reason || 'Failed transfer',
      error: data.reason || 'Unknown error',
    },
  });
}

export default router;