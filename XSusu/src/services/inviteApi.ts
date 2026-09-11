import { api } from './api';

export interface InviteResponse {
  status: 'ADDED' | 'INVITED';
  inviteCode?: string;
  userId?: string;
}

export interface PendingInvite {
  id: string;
  phone: string;
  name?: string;
  position: number;
  inviteCode: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
  group?: {
    id: string;
    name: string;
  };
  creator?: {
    firstName: string;
    lastName: string;
  };
}

export class InviteApi {
  
  /**
   * Invite a member by phone number
   */
  async inviteByPhone(groupId: string, phone: string, position: number, name?: string): Promise<InviteResponse> {
    const response: any = await api.post(`/groups/${groupId}/invites`, {
      phone,
      name,
      position,
    });
    return response.data;
  }

  /**
   * Generate a shareable invite link
   */
  async generateShareLink(groupId: string): Promise<string> {
    const response: any = await api.get(`/groups/${groupId}/invites/share-link`);
    return response.data.shareUrl;
  }

  /**
   * Join a group using an invite code
   */
  async joinByCode(inviteCode: string): Promise<any> {
    const response: any = await api.post('/invites/join', { inviteCode });
    return response.data;
  }

  /**
   * Get pending invites for a group (admin only)
   */
  async getPendingInvites(groupId: string): Promise<PendingInvite[]> {
    const response: any = await api.get(`/groups/${groupId}/invites`);
    return response.data.invites;
  }

  /**
   * Cancel a pending invite
   */
  async cancelInvite(inviteId: string): Promise<void> {
    await api.delete(`/invites/${inviteId}`);
  }

  /**
   * Get all invites for the current user
   */
  async getMyInvites(): Promise<PendingInvite[]> {
    const response: any = await api.get('/invites/my-invites');
    return response.data.invites;
  }
}

export const inviteApi = new InviteApi();