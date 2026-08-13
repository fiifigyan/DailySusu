import { prisma } from '../config/database';
import { paymentService } from './payment.service';
import { SUSU_RULES, calculateSurplusBreakdown, parseSurplusUse } from '../config/susu-rules';
import { logger } from '../utils/logger';

interface TodayRecipient {
  id: string;
  name: string;
  phone: string | null;
  position: number;
}

interface PendingMember {
  id: string;
  name: string;
  phone: string | null;
  position: number;
}

export class ContributionService {

  /**
   * Record a manual payment (member confirms they paid)
   */
  async recordPayment(userId: string, data: {
    groupId: string;
    day: number;
    amount: number;
  }): Promise<{ success: boolean }> {
    const group = await prisma.susuGroup.findUnique({ where: { id: data.groupId } });
    if (!group) throw Object.assign(new Error('Group not found'), { statusCode: 404 });
    if (group.status !== 'ACTIVE') throw Object.assign(new Error('Group is not active'), { statusCode: 400 });
    if (data.day !== group.currentDay) throw Object.assign(new Error('Can only record payment for today'), { statusCode: 400 });

    const member = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId },
    });
    if (!member) throw Object.assign(new Error('Not a member of this group'), { statusCode: 403 });

    const existing = await prisma.contribution.findFirst({
      where: { memberId: member.id, day: data.day },
    });

    if (existing && ['PAID', 'VERIFIED'].includes(existing.status)) {
      throw Object.assign(new Error('Payment already recorded for today'), { statusCode: 409 });
    }

    if (existing) {
      await prisma.contribution.update({
        where: { id: existing.id },
        data: { status: 'PAID', amount: data.amount, paidAt: new Date(), recordedBy: userId },
      });
    } else {
      await prisma.contribution.create({
        data: {
          groupId: data.groupId,
          memberId: member.id,
          userId,
          day: data.day,
          amount: data.amount,
          status: 'PAID',
          paidAt: new Date(),
          recordedBy: userId,
        },
      });
    }

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { totalPaid: member.totalPaid + 1 },
    });

    return { success: true };
  }

  /**
   * Verify payment via Paystack webhook or manual verification
   */
  async verifyPayment(userId: string, data: {
    groupId: string;
    day: number;
    amount: number;
    transactionRef: string;
  }): Promise<{ success: boolean; status: string }> {
    const member = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId },
    });
    if (!member) throw Object.assign(new Error('Not a member of this group'), { statusCode: 403 });

    const existing = await prisma.contribution.findFirst({
      where: { memberId: member.id, day: data.day },
    });

    if (existing?.status === 'VERIFIED') {
      return { success: true, status: 'ALREADY_VERIFIED' };
    }

    const updateData = {
      status: 'VERIFIED' as const,
      transactionRef: data.transactionRef,
      verifiedAt: new Date(),
    };

    if (existing) {
      await prisma.contribution.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.contribution.create({
        data: {
          groupId: data.groupId,
          memberId: member.id,
          userId,
          day: data.day,
          amount: data.amount,
          ...updateData,
          paidAt: new Date(),
          recordedBy: userId,
        },
      });
    }

    return { success: true, status: 'VERIFIED' };
  }

  /**
   * Get today's status for a group
   */
  async getTodayStatus(groupId: string): Promise<any> {
    const group = await prisma.susuGroup.findUnique({ where: { id: groupId } });
    if (!group || group.status !== 'ACTIVE') return null;

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    const contributions = await prisma.contribution.findMany({
      where: { groupId, day: group.currentDay },
    });

    const todayRecipient = members.find(m => m.position === group.currentDay);
    const paidMembers = contributions.filter(c => ['PAID', 'VERIFIED'].includes(c.status));
    const pendingMembers = members.filter(m => !paidMembers.find(p => p.memberId === m.id));

    return {
      groupId,
      day: group.currentDay,
      totalDays: group.totalDays,
      dailyContribution: group.dailyContribution,
      dailyPayout: group.dailyPayout,
      todayRecipient: todayRecipient ? {
        id: todayRecipient.id,
        name: `${todayRecipient.user.firstName} ${todayRecipient.user.lastName}`,
        phone: todayRecipient.user.phone,
        position: todayRecipient.position,
      } : null,
      paidCount: paidMembers.length,
      totalMembers: members.length,
      pendingMembers: pendingMembers.map(m => ({
        id: m.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        phone: m.user.phone,
        position: m.position,
      })),
      allPaid: paidMembers.length === members.length,
    };
  }

  /**
   * COMPLETE PAYOUT - The core surplus distribution method
   * 
   * This method:
   * 1. Verifies all members have paid
   * 2. Calculates surplus allocation using system rules
   * 3. Creates disbursement requests for all parties
   * 4. Executes bulk disbursement via Paystack
   * 5. Records everything in database
   * 6. Advances the group to the next day
   * 7. Handles failures with retry mechanism
   */
  async completePayout(groupId: string, day: number, userId: string): Promise<any> {
    const group = await prisma.susuGroup.findUnique({ where: { id: groupId } });
    if (!group) throw Object.assign(new Error('Group not found'), { statusCode: 404 });
    
    // Only admin can complete payout
    if (group.createdById !== userId) {
      throw Object.assign(new Error('Only group admin can complete payout'), { statusCode: 403 });
    }

    // Verify all members have paid
    const contributions = await prisma.contribution.findMany({
      where: { groupId, day, status: { in: ['PAID', 'VERIFIED'] } },
    });
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true },
    });

    if (contributions.length < members.length) {
      throw Object.assign(
        new Error(`Only ${contributions.length}/${members.length} members have paid. Cannot complete payout.`),
        { statusCode: 400 }
      );
    }

    // Get today's recipient
    const recipient = members.find(m => m.position === day);
    if (!recipient) throw Object.assign(new Error('Recipient not found'), { statusCode: 404 });

    // Parse surplus allocation from group settings
    let surplusData = parseSurplusUse(group.surplusUse);
    
    if (!surplusData || !surplusData.allocation) {
      // Recalculate if missing
      const breakdown = calculateSurplusBreakdown(
        group.memberCount,
        group.dailyContribution,
        group.dailyPayout
      );
      surplusData = {
        allocation: breakdown.allocation,
        fees: breakdown.fees,
      };
    }

    const allocation = surplusData.allocation;
    const fees = surplusData.fees;

    // ============================================
    // BUILD DISBURSEMENT REQUESTS
    // ============================================
    const disbursements: Array<{
      recipientCode: string;
      amount: number;
      reference: string;
      reason: string;
      type: string;
    }> = [];

    // 1. Payout to recipient
    if (recipient.user.paystackRecipientCode) {
      disbursements.push({
        recipientCode: recipient.user.paystackRecipientCode,
        amount: group.dailyPayout,
        reference: `PAYOUT-${groupId}-D${day}-${Date.now()}`,
        reason: `Susu payout - ${group.name} Day ${day}`,
        type: 'PAYOUT',
      });
    } else {
      // Create recipient code on the fly
      const recipientCode = await paymentService.getOrCreateRecipientCode(
        `${recipient.user.firstName} ${recipient.user.lastName}`,
        recipient.user.phone
      );
      
      // Save for future use
      await prisma.user.update({
        where: { id: recipient.userId },
        data: { paystackRecipientCode: recipientCode },
      });
      
      disbursements.push({
        recipientCode,
        amount: group.dailyPayout,
        reference: `PAYOUT-${groupId}-D${day}-${Date.now()}`,
        reason: `Susu payout - ${group.name} Day ${day}`,
        type: 'PAYOUT',
      });
    }

    // 2. App Maintenance Fee (your revenue)
    if (allocation.appMaintenance > 0) {
      const appOwnerCode = await this.getAppOwnerRecipientCode();
      disbursements.push({
        recipientCode: appOwnerCode,
        amount: allocation.appMaintenance,
        reference: `APPMTN-${groupId}-D${day}-${Date.now()}`,
        reason: `App maintenance - ${group.name} Day ${day}`,
        type: 'APP_MAINTENANCE',
      });
    }

    // 3. Admin Compensation
    if (allocation.adminCompensation > 0) {
      const admin = await prisma.user.findUnique({ where: { id: group.createdById } });
      if (admin?.paystackRecipientCode) {
        disbursements.push({
          recipientCode: admin.paystackRecipientCode,
          amount: allocation.adminCompensation,
          reference: `ADMIN-${groupId}-D${day}-${Date.now()}`,
          reason: `Admin compensation - ${group.name} Day ${day}`,
          type: 'ADMIN_COMPENSATION',
        });
      }
    }

    // 4. Emergency Fund
    if (allocation.emergencyFund > 0) {
      const emergencyCode = await this.getEmergencyFundRecipientCode();
      if (emergencyCode) {
        disbursements.push({
          recipientCode: emergencyCode,
          amount: allocation.emergencyFund,
          reference: `EMERG-${groupId}-D${day}-${Date.now()}`,
          reason: `Emergency fund - ${group.name} Day ${day}`,
          type: 'EMERGENCY_FUND',
        });
      }
    }

    // 5. Savings Pool
    if (allocation.savingsPool > 0) {
      const savingsCode = await this.getSavingsPoolRecipientCode();
      if (savingsCode) {
        disbursements.push({
          recipientCode: savingsCode,
          amount: allocation.savingsPool,
          reference: `SAVING-${groupId}-D${day}-${Date.now()}`,
          reason: `Savings pool - ${group.name} Day ${day}`,
          type: 'SAVINGS_POOL',
        });
      }
    }

    // ============================================
    // EXECUTE BULK DISBURSEMENT
    // ============================================
    const payoutRecord = await prisma.payout.findFirst({ where: { groupId, day } });
    
    // Mark payout as processing
    if (payoutRecord) {
      await prisma.payout.update({
        where: { id: payoutRecord.id },
        data: { status: 'PROCESSING' },
      });
    }

    const disbursementResult = await paymentService.bulkDisburse(
      disbursements.map(d => ({
        recipientCode: d.recipientCode,
        amount: d.amount,
        reference: d.reference,
        reason: d.reason,
      }))
    );

    // ============================================
    // HANDLE RESULTS
    // ============================================
    if (disbursementResult.success) {
      // All transfers succeeded
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: payoutRecord!.id },
          data: {
            status: 'DISTRIBUTED',
            distributedAt: new Date(),
            confirmedBy: userId,
            bulkTransferId: disbursementResult.batchId,
          },
        }),
        prisma.groupMember.update({
          where: { id: recipient.id },
          data: { hasReceivedPayout: true, payoutDate: new Date() },
        }),
      ]);

      // Record all fees
      for (const d of disbursements) {
        if (d.type !== 'PAYOUT') {
          await prisma.appFee.create({
            data: {
              groupId,
              amount: d.amount,
              month: new Date().toISOString().slice(0, 7),
              type: 'DAILY_SURPLUS',
              transactionRef: d.reference,
              status: 'PAID',
              paidAt: new Date(),
            },
          });
        }
      }

      // Advance to next day
      return await this.advanceToNextDay(groupId, day, group.totalDays);
    } else {
      // Some transfers failed - store for retry
      logger.error('Bulk disbursement partially failed:', disbursementResult);
      
      for (const d of disbursements) {
        const failed = disbursementResult.transfers.find(t => 
          t.recipientCode === d.recipientCode && !t.success
        );
        
        if (failed) {
          await prisma.failedDisbursement.create({
            data: {
              groupId,
              payoutId: payoutRecord?.id || '',
              recipientPhone: d.recipientCode,
              amount: d.amount,
              description: d.reason,
              error: failed.error || 'Unknown error',
            },
          });
        }
      }

      // Mark payout as failed
      if (payoutRecord) {
        await prisma.payout.update({
          where: { id: payoutRecord.id },
          data: { status: 'FAILED' },
        });
      }

      throw Object.assign(
        new Error('Payout partially failed. Failed transfers stored for retry.'),
        { statusCode: 500 }
      );
    }
  }

  /**
   * Advance group to next day
   */
  private async advanceToNextDay(groupId: string, currentDay: number, totalDays: number): Promise<any> {
    const nextDay = currentDay + 1;

    if (nextDay <= totalDays) {
      // Create next day's payout record
      const nextRecipient = await prisma.groupMember.findFirst({
        where: { groupId, position: nextDay },
      });

      if (nextRecipient) {
        const group = await prisma.susuGroup.findUnique({ where: { id: groupId } });
        await prisma.payout.create({
          data: {
            groupId,
            recipientId: nextRecipient.id,
            day: nextDay,
            amount: group!.dailyPayout,
          },
        });
      }

      await prisma.susuGroup.update({
        where: { id: groupId },
        data: { currentDay: nextDay, updatedAt: new Date() },
      });

      return { success: true, nextDay, groupStatus: 'ACTIVE' };
    } else {
      // Group is complete
      await prisma.susuGroup.update({
        where: { id: groupId },
        data: { status: 'COMPLETED', endDate: new Date(), updatedAt: new Date() },
      });

      return { success: true, nextDay: null, groupStatus: 'COMPLETED' };
    }
  }

  /**
   * Get or create app owner's recipient code
   */
  private async getAppOwnerRecipientCode(): Promise<string> {
    const owner = await prisma.user.findFirst({ where: { role: 'APP_ADMIN' } });
    if (owner?.paystackRecipientCode) return owner.paystackRecipientCode;
    
    // Create from config
    return paymentService.getOrCreateRecipientCode(
      'XSusu App Owner',
      process.env.APP_OWNER_ACCOUNT_NUMBER || '',
      process.env.APP_OWNER_BANK_CODE || 'MTN'
    );
  }

  /**
   * Get or create emergency fund recipient code
   */
  private async getEmergencyFundRecipientCode(): Promise<string | null> {
    if (!process.env.EMERGENCY_FUND_ACCOUNT_NUMBER) return null;
    
    return paymentService.getOrCreateRecipientCode(
      'XSusu Emergency Fund',
      process.env.EMERGENCY_FUND_ACCOUNT_NUMBER,
      process.env.EMERGENCY_FUND_BANK_CODE || 'MTN'
    );
  }

  /**
   * Get or create savings pool recipient code
   */
  private async getSavingsPoolRecipientCode(): Promise<string | null> {
    if (!process.env.SAVINGS_POOL_ACCOUNT_NUMBER) return null;
    
    return paymentService.getOrCreateRecipientCode(
      'XSusu Savings Pool',
      process.env.SAVINGS_POOL_ACCOUNT_NUMBER,
      process.env.SAVINGS_POOL_BANK_CODE || 'MTN'
    );
  }

  /**
   * Record app fee (for completeness - not currently used)
   */
  async recordAppFee(userId: string, groupId: string, amount: number, month: string, transactionRef: string) {
    const member = await prisma.groupMember.findFirst({ where: { groupId, userId } });
    if (!member) throw Object.assign(new Error('Not a member'), { statusCode: 403 });

    await prisma.appFee.create({
      data: {
        memberId: member.id,
        groupId,
        amount,
        month,
        transactionRef,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get contribution history for a group
   */
  async getContributionHistory(groupId: string): Promise<any> {
    const contributions = await prisma.contribution.findMany({
      where: { groupId },
      include: {
        member: { include: { user: true } },
      },
      orderBy: { day: 'asc' },
    });

    return contributions;
  }
}