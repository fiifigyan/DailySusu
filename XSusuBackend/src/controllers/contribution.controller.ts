import { Request, Response, NextFunction } from 'express';
import { ContributionService } from '../services/contribution.service';
import { z } from 'zod';

const contributionService = new ContributionService();

const recordPaymentSchema = z.object({
  groupId: z.string().uuid(),
  day: z.number().min(1),
  amount: z.number().min(1),
});

const verifyPaymentSchema = z.object({
  groupId: z.string().uuid(),
  day: z.number().min(1),
  amount: z.number().min(1),
  transactionRef: z.string().min(1),
});

export class ContributionController {
  async recordManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = recordPaymentSchema.parse(req.body);
      const userId = (req as any).userId;
      const result = await contributionService.recordPayment(userId, validatedData);
      
      res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyAndRecordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = verifyPaymentSchema.parse(req.body);
      const userId = (req as any).userId;
      const result = await contributionService.verifyPayment(userId, validatedData);
      
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const status = await contributionService.getTodayStatus(groupId);
      
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async completePayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const { day } = req.body;
      const userId = (req as any).userId;
      const result = await contributionService.completePayout(groupId, day, userId);
      
      res.status(200).json({
        success: true,
        message: 'Payout completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getContributionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const history = await contributionService.getContributionHistory(groupId);
      
      res.status(200).json({
        success: true,
        data: { history },
      });
    } catch (error) {
      next(error);
    }
  }

  async recordAppFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { groupId, amount, month, transactionRef } = req.body;
      const result = await contributionService.recordAppFee(userId, groupId, amount, month, transactionRef);
      
      res.status(200).json({
        success: true,
        message: 'App fee recorded',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}