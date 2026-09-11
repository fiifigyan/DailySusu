import { prisma } from '../config/database';
import { hashPhone } from '../utils/encryption';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class InviteService {

  /**
   * Invite a member by phone number
   * If user exists → add directly + send app notification
   * If user doesn't exist → create pending invite + send SMS
   */
  async inviteByPhone(data: {
    groupId: string;
    adminId: string;
    phone: string;
    name?: string;
    position: number;
  }): Promise<{ status: 'ADDED' | 'INVITED'; inviteCode?: string; userId?: string }> {
    const group = await prisma.susuGroup.findUnique({ where: { id: data.groupId } });
    if (!group) throw Object.assign(new Error('Group not found'), { statusCode: 404 });
    if (group.createdById !== data.adminId) {
      throw Object.assign(new Error('Only group admin can invite members'), { statusCode: 403 });
    }
    if (group.status !== 'FORMING') {
      throw Object.assign(new Error('Cannot invite members to an active group'), { statusCode: 400 });
    }

    // Check position availability
    const positionTaken = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, position: data.position },
    });
    if (positionTaken) {
      throw Object.assign(new Error(`Position ${data.position} is already taken`), { statusCode: 409 });
    }

    // Check for existing pending invite at this position
    const pendingAtPosition = await prisma.pendingInvite.findFirst({
      where: { groupId: data.groupId, position: data.position, accepted: false },
    });
    if (pendingAtPosition && pendingAtPosition.expiresAt > new Date()) {
      throw Object.assign(
        new Error(`Position ${data.position} has a pending invite. Wait for it to expire.`),
        { statusCode: 409 }
      );
    }

    const phoneHashValue = hashPhone(data.phone);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { phoneHash: phoneHashValue },
    });

    if (existingUser) {
      // User exists - add directly
      const alreadyMember = await prisma.groupMember.findFirst({
        where: { groupId: data.groupId, userId: existingUser.id },
      });
      if (alreadyMember) {
        throw Object.assign(new Error('User is already a member of this group'), { statusCode: 409 });
      }

      await prisma.groupMember.create({
        data: {
          groupId: data.groupId,
          userId: existingUser.id,
          position: data.position,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          type: 'GROUP_INVITE',
          title: 'You\'ve been added to a group',
          message: `You joined "${group.name}" as member #${data.position}. Your payout day is Day ${data.position}.`,
          groupId: data.groupId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: data.adminId,
          groupId: data.groupId,
          action: 'MEMBER_ADDED',
          details: `${existingUser.firstName} ${existingUser.lastName} added as #${data.position}`,
        },
      });

      return { status: 'ADDED', userId: existingUser.id };
    } else {
      // User doesn't exist - create pending invite
      const inviteCode = this.generateInviteCode();

      await prisma.pendingInvite.create({
        data: {
          groupId: data.groupId,
          phone: data.phone,
          phoneHash: phoneHashValue,
          name: data.name || null,
          position: data.position,
          inviteCode,
          createdBy: data.adminId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Send SMS invite (placeholder - integrate with SMS provider)
      await this.sendSMSInvite(data.phone, data.name ?? null, group.name, data.position, inviteCode);

      await prisma.auditLog.create({
        data: {
          userId: data.adminId,
          groupId: data.groupId,
          action: 'INVITE_SENT',
          details: `Invite sent to ${data.phone} for position #${data.position}`,
          metadata: { inviteCode },
        },
      });

      return { status: 'INVITED', inviteCode };
    }
  }

  /**
   * Generate a shareable invite link
   */
  async generateShareLink(groupId: string, adminId: string): Promise<string> {
    const group = await prisma.susuGroup.findUnique({ where: { id: groupId } });
    if (!group) throw Object.assign(new Error('Group not found'), { statusCode: 404 });
    if (group.createdById !== adminId) {
      throw Object.assign(new Error('Only group admin can generate invite links'), { statusCode: 403 });
    }

    // Use existing share code or generate new one
    let shareCode = group.shareCode;
    if (!shareCode) {
      shareCode = this.generateShareCode(group.name);
      await prisma.susuGroup.update({
        where: { id: groupId },
        data: { shareCode },
      });
    }

    return `https://xsusu.com/join/${shareCode}`;
  }

  /**
   * Join a group using an invite code
   */
  async joinByInviteCode(inviteCode: string, userId: string): Promise<{
    group: any;
    position: number;
  }> {
    const invite = await prisma.pendingInvite.findFirst({
      where: {
        inviteCode,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      include: { group: true },
    });

    if (!invite) {
      throw Object.assign(new Error('Invalid or expired invite code'), { statusCode: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    // Verify phone matches invite (security check)
    if (hashPhone(user.phone) !== invite.phoneHash) {
      throw Object.assign(
        new Error('This invite was sent to a different phone number'),
        { statusCode: 403 }
      );
    }

    // Check if already a member
    const alreadyMember = await prisma.groupMember.findFirst({
      where: { groupId: invite.groupId, userId },
    });
    if (alreadyMember) {
      throw Object.assign(new Error('You are already a member of this group'), { statusCode: 409 });
    }

    // Check if position is still available
    const positionTaken = await prisma.groupMember.findFirst({
      where: { groupId: invite.groupId, position: invite.position },
    });
    if (positionTaken) {
      throw Object.assign(
        new Error(`Position ${invite.position} has already been taken`),
        { statusCode: 409 }
      );
    }

    // Add member and mark invite as accepted
    await prisma.$transaction([
      prisma.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId,
          position: invite.position,
        },
      }),
      prisma.pendingInvite.update({
        where: { id: invite.id },
        data: {
          accepted: true,
          acceptedBy: userId,
          acceptedAt: new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId,
        groupId: invite.groupId,
        action: 'INVITE_ACCEPTED',
        details: `${user.firstName} ${user.lastName} joined as #${invite.position}`,
      },
    });

    return {
      group: invite.group,
      position: invite.position,
    };
  }

  /**
   * Get all pending invites for a group
   */
  async getPendingInvites(groupId: string, adminId: string): Promise<any[]> {
    const group = await prisma.susuGroup.findUnique({ where: { id: groupId } });
    if (!group) throw Object.assign(new Error('Group not found'), { statusCode: 404 });
    if (group.createdById !== adminId) {
      throw Object.assign(new Error('Only group admin can view pending invites'), { statusCode: 403 });
    }

    return await prisma.pendingInvite.findMany({
      where: {
        groupId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Cancel a pending invite
   */
  async cancelInvite(inviteId: string, adminId: string): Promise<void> {
    const invite = await prisma.pendingInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw Object.assign(new Error('Invite not found'), { statusCode: 404 });

    const group = await prisma.susuGroup.findUnique({ where: { id: invite.groupId } });
    if (!group || group.createdById !== adminId) {
      throw Object.assign(new Error('Only group admin can cancel invites'), { statusCode: 403 });
    }

    await prisma.pendingInvite.delete({ where: { id: inviteId } });
  }

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `XSU-${code.substring(0, 3)}-${code.substring(3, 6)}`;
  }

  /**
   * Generate share code from group name
   */
  private generateShareCode(groupName: string): string {
    const cleanName = groupName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 4);
    return `${cleanName || 'SUSU'}-${randomPart}`;
  }

  /**
   * Send SMS invite (placeholder)
   */
  private async sendSMSInvite(
    phone: string,
    name: string | null,
    groupName: string,
    position: number,
    inviteCode: string
  ): Promise<void> {
    // TODO: Integrate with SMS provider (e.g., Hubtel SMS, Termii, etc.)
    logger.info(`
      SMS Invite to: ${phone}
      Name: ${name || 'Friend'}
      Group: ${groupName}
      Position: #${position}
      Code: ${inviteCode}
    `);
  }

  /**
   * Get all invites for the current user
   */
  async getMyInvites(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const invites = await prisma.pendingInvite.findMany({
      where: {
        phoneHash: hashPhone(user.phone),
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            memberCount: true,
            dailyContribution: true,
            dailyPayout: true,
            status: true,
          },
        },
        creator: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites;
  }
}

export const inviteService = new InviteService();