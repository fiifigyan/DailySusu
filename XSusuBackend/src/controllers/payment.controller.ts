import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { prisma } from '../config/database';
import { z } from 'zod';

const initializePaymentSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().min(1),
  channel: z.enum(['mtn_mobile_money', 'vodafone_cash', 'airteltigo_money']),
  reference: z.string().min(1),
});

export class PaymentController {
  
  /**
   * Initialize a payment for daily contribution
   */
  async initializePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = initializePaymentSchema.parse(req.body);
      const userId = (req as any).userId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

      const result = await paymentService.initializeCollection({
        email: user.email,
        phone: user.phone,
        amount: validatedData.amount,
        reference: validatedData.reference,
        channel: validatedData.channel,
        metadata: {
          groupId: validatedData.groupId,
          userId,
        },
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a payment status
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;
      const result = await paymentService.verifyPayment(reference);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}