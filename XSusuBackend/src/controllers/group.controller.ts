import { Request, Response, NextFunction } from 'express';
import { GroupService } from '../services/group.service';
import { z } from 'zod';

const groupService = new GroupService();

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().optional(),
  memberCount: z.number().min(2, 'At least 2 members required').max(100, 'Maximum 100 members'),
  dailyContribution: z.number().min(1, 'Minimum contribution is GHS 1'),
  dailyPayout: z.number().min(1, 'Minimum payout is GHS 1'),
  surplusUse: z.string().optional(),
  verificationMethod: z.enum(['MANUAL', 'AUTO_VERIFY']).default('MANUAL'),
  appFeePerMember: z.number().min(0).default(0),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  position: z.number().min(1),
});

export class GroupController {
  async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createGroupSchema.parse(req.body);
      const userId = (req as any).userId;
      const group = await groupService.createGroup(userId, validatedData);
      
      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: { group },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const groups = await groupService.getUserGroups(userId);
      
      res.status(200).json({
        success: true,
        data: { groups },
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const details = await groupService.getGroupDetails(groupId);
      
      res.status(200).json({
        success: true,
        data: { group: details },
      });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const validatedData = addMemberSchema.parse(req.body);
      const member = await groupService.addMember(groupId, validatedData);
      
      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  async startGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = (req as any).userId;
      const result = await groupService.startGroup(groupId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Group started successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayoutSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const schedule = await groupService.getPayoutSchedule(groupId);
      
      res.status(200).json({
        success: true,
        data: { schedule },
      });
    } catch (error) {
      next(error);
    }
  }
}