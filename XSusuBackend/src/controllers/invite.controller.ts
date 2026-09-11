import { Request, Response, NextFunction } from 'express';
import { inviteService } from '../services/invite.service';
import { z } from 'zod';

const inviteByPhoneSchema = z.object({
  phone: z.string().regex(/^0[245]\d{8}$/, 'Invalid Ghana phone number'),
  name: z.string().optional(),
  position: z.number().min(1).max(100),
});

const joinByCodeSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export class InviteController {

  /**
   * Invite a member by phone number
   * POST /api/v1/groups/:groupId/invites
   */
  async inviteByPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const adminId = (req as any).userId;
      const validatedData = inviteByPhoneSchema.parse(req.body);

      const result = await inviteService.inviteByPhone({
        groupId,
        adminId,
        phone: validatedData.phone,
        name: validatedData.name,
        position: validatedData.position,
      });

      res.status(201).json({
        success: true,
        message: result.status === 'ADDED' ? 'Member added successfully' : 'Invite sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate share link
   * GET /api/v1/groups/:groupId/invites/share-link
   */
  async generateShareLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const adminId = (req as any).userId;

      const shareUrl = await inviteService.generateShareLink(groupId, adminId);

      res.status(200).json({
        success: true,
        data: { shareUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Join group by invite code
   * POST /api/v1/invites/join
   */
  async joinByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const validatedData = joinByCodeSchema.parse(req.body);

      const result = await inviteService.joinByInviteCode(validatedData.inviteCode, userId);

      res.status(200).json({
        success: true,
        message: 'Successfully joined group',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invites for a group (admin only)
   * GET /api/v1/groups/:groupId/invites
   */
  async getPendingInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const adminId = (req as any).userId;

      const invites = await inviteService.getPendingInvites(groupId, adminId);

      res.status(200).json({
        success: true,
        data: { invites },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a pending invite
   * DELETE /api/v1/invites/:inviteId
   */
  async cancelInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inviteId } = req.params;
      const adminId = (req as any).userId;

      await inviteService.cancelInvite(inviteId, adminId);

      res.status(200).json({
        success: true,
        message: 'Invite cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invites for current user
   * GET /api/v1/invites/my-invites
   */
  async getMyInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;

      const invites = await inviteService.getMyInvites(userId);

      res.status(200).json({
        success: true,
        data: { invites },
      });
    } catch (error) {
      next(error);
    }
  }
}