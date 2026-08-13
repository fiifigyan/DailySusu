/**
 * PAYSTACK CONFIGURATION
 * All payment-related settings centralized here
 */

export const PAYSTACK_CONFIG = {
  // API Keys
  SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',

  // API Base URL
  BASE_URL: 'https://api.paystack.co',

  // Endpoints
  ENDPOINTS: {
    INITIALIZE_TRANSACTION: '/transaction/initialize',
    VERIFY_TRANSACTION: '/transaction/verify',
    CHARGE_AUTHORIZATION: '/transaction/charge_authorization',
    CREATE_TRANSFER_RECIPIENT: '/transferrecipient',
    INITIATE_TRANSFER: '/transfer',
    BULK_TRANSFER: '/transfer/bulk',
    LIST_BANKS: '/bank',
    RESOLVE_ACCOUNT: '/bank/resolve',
  },

  // Mobile Money Channels
  MOBILE_MONEY_CHANNELS: [
    'mtn_mobile_money',
    'vodafone_cash',
    'airteltigo_money',
  ] as const,

  // Business accounts (where money goes)
  BUSINESS_ACCOUNTS: {
    APP_OWNER: {
      name: process.env.APP_OWNER_ACCOUNT_NAME || 'XSusu App Revenue',
      bankCode: process.env.APP_OWNER_BANK_CODE || 'MTN',
      accountNumber: process.env.APP_OWNER_ACCOUNT_NUMBER || '',
    },
    EMERGENCY_FUND: {
      name: 'XSusu Emergency Fund',
      bankCode: process.env.EMERGENCY_FUND_BANK_CODE || 'MTN',
      accountNumber: process.env.EMERGENCY_FUND_ACCOUNT_NUMBER || '',
    },
    SAVINGS_POOL: {
      name: 'XSusu Savings Pool',
      bankCode: process.env.SAVINGS_POOL_BANK_CODE || 'MTN',
      accountNumber: process.env.SAVINGS_POOL_ACCOUNT_NUMBER || '',
    },
  },

  // Fee Settings (for display)
  FEES: {
    COLLECTION_PERCENT: 1.95,
    VAT_PERCENT: 15,
    DISBURSEMENT_FLAT: 10,
  },
};

/**
 * Get Paystack MoMo bank code from channel
 */
export function getMoMoBankCode(channel: string): string {
  const mapping: Record<string, string> = {
    'mtn_mobile_money': 'MTN',
    'vodafone_cash': 'VOD',
    'airteltigo_money': 'ATL',
  };
  return mapping[channel] || 'MTN';
}

/**
 * Convert GHS to Pesewas (Paystack uses pesewas)
 */
export function toPesewas(amountInGHS: number): number {
  return Math.round(amountInGHS * 100);
}

/**
 * Convert Pesewas to GHS
 */
export function toGHS(amountInPesewas: number): number {
  return amountInPesewas / 100;
}