import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Interfaces for typed query results
interface Fee {
  id: string;
  amount: number;
  status: string;
  paidAt?: Date | null;
  month: string;
  groupId: string;
  group?: { name: string | null; memberCount: number | null } | null;
  member?: { user?: { firstName?: string | null; lastName?: string | null } | null } | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  distributedAt?: Date | null;
  groupId?: string | null;
  group?: { name: string | null } | null;
}

interface FailedDisbursement {
  id: string;
  resolved: boolean;
  createdAt: Date;
}

interface MonthlyBreakdownRecord {
  revenue: number;
  fees: number;
  payouts: number;
}

interface PerGroupRevenueRecord {
  groupName: string;
  totalRevenue: number;
  memberCount: number;
}

export class AdminController {
  
  /**
   * Get comprehensive revenue report with surplus breakdown
   */
  async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const where = {
        status: 'PAID' as const,
        paidAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        },
      };

      // Get all fees
      const fees: Fee[] = await prisma.appFee.findMany({
        where,
        include: {
          group: { select: { name: true, memberCount: true } },
          member: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      });

      // Get payout stats
      const payouts: Payout[] = await prisma.payout.findMany({
        where: {
          status: 'DISTRIBUTED',
          distributedAt: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined,
          },
        },
        include: {
          group: { select: { name: true } },
        },
      });

      // Calculate totals
      const totalRevenue: number = fees.reduce((sum, f) => sum + f.amount, 0);
      const totalPayouts: number = payouts.reduce((sum, p) => sum + p.amount, 0);

      // Monthly breakdown
      const monthlyBreakdown: Record<string, MonthlyBreakdownRecord> = fees.reduce((acc, fee) => {
        const month = fee.month;
        if (!acc[month]) acc[month] = { revenue: 0, fees: 0, payouts: 0 };
        acc[month].revenue += fee.amount;
        acc[month].fees += 1;
        return acc;
      }, {} as Record<string, MonthlyBreakdownRecord>);

      // Add payouts to monthly breakdown
      for (const payout of payouts) {
        const month = payout.distributedAt!.toISOString().slice(0, 7);
        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = { revenue: 0, fees: 0, payouts: 0 };
        }
        monthlyBreakdown[month].payouts += payout.amount;
      }

      // Per-group revenue
      const perGroupRevenue: Record<string, PerGroupRevenueRecord> = fees.reduce((acc, fee) => {
        const groupId = fee.groupId;
        if (!acc[groupId]) {
          acc[groupId] = {
            groupName: fee.group?.name || 'Unknown',
            totalRevenue: 0,
            memberCount: fee.group?.memberCount || 0,
          };
        }
        acc[groupId].totalRevenue += fee.amount;
        return acc;
      }, {} as Record<string, PerGroupRevenueRecord>);

      // Failed disbursements
      const failedDisbursements: FailedDisbursement[] = await prisma.failedDisbursement.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalRevenue,
            totalPayouts,
            totalFees: fees.length,
            failedDisbursementCount: failedDisbursements.length,
            activeGroups: await prisma.susuGroup.count({ where: { status: 'ACTIVE' } }),
            completedGroups: await prisma.susuGroup.count({ where: { status: 'COMPLETED' } }),
          },
          monthlyBreakdown,
          perGroupRevenue: Object.values(perGroupRevenue),
          recentFees: fees.slice(0, 20),
          failedDisbursements: failedDisbursements.slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security logs
   */
  async getSecurityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await prisma.securityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.status(200).json({
        success: true,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get dashboard stats
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [totalUsers, totalGroups, activeGroups, completedGroups, totalContributions, failedDisbursements] = await Promise.all([
        prisma.user.count(),
        prisma.susuGroup.count(),
        prisma.susuGroup.count({ where: { status: 'ACTIVE' } }),
        prisma.susuGroup.count({ where: { status: 'COMPLETED' } }),
        prisma.contribution.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['PAID', 'VERIFIED'] } },
        }),
        prisma.failedDisbursement.count({ where: { resolved: false } }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalGroups,
          activeGroups,
          completedGroups,
          totalContributions: totalContributions._sum.amount || 0,
          pendingRetries: failedDisbursements,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}