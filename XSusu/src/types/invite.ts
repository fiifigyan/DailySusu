export interface PendingInvite {
  id: string;
  groupId: string;
  phone: string;
  name?: string;
  position: number;
  inviteCode: string;
  accepted: boolean;
  expiresAt: string;
  createdAt: string;
  group?: {
    id: string;
    name: string;
    memberCount: number;
    dailyContribution: number;
    dailyPayout: number;
    status: string;
  };
  creator?: {
    firstName: string;
    lastName: string;
  };
}

export interface InviteResult {
  status: 'ADDED' | 'INVITED';
  inviteCode?: string;
  userId?: string;
}

export type InviteMethod = 'PHONE' | 'LINK' | 'CODE';