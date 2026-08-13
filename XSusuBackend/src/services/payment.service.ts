import axios from 'axios';
import crypto from 'crypto';
import { PAYSTACK_CONFIG, getMoMoBankCode, toPesewas, toGHS } from '../config/payment';
import { logger } from '../utils/logger';

interface DisbursementRequest {
  recipientCode: string;
  amount: number; // In GHS
  reference: string;
  reason: string;
}

interface BulkDisbursementResult {
  success: boolean;
  batchId?: string;
  transfers: {
    success: boolean;
    reference: string;
    amount: number;
    recipientCode: string;
    transactionId?: string;
    error?: string;
  }[];
}

export class PaymentService {
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${PAYSTACK_CONFIG.SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a payment request for a member
   * Returns payment URL or USSD code
   */
  async initializeCollection(data: {
    email: string;
    phone: string;
    amount: number; // In GHS
    reference: string;
    channel: string; // 'mtn_mobile_money', etc.
    metadata?: any;
  }): Promise<{
    success: boolean;
    reference: string;
    paymentUrl?: string;
    ussdCode?: string;
    accessCode?: string;
  }> {
    try {
      const response = await axios.post(
        `${PAYSTACK_CONFIG.BASE_URL}${PAYSTACK_CONFIG.ENDPOINTS.INITIALIZE_TRANSACTION}`,
        {
          email: data.email,
          amount: toPesewas(data.amount),
          reference: data.reference,
          currency: 'GHS',
          channels: [data.channel],
          metadata: {
            phone: data.phone,
            channel: data.channel,
            ...data.metadata,
          },
        },
        { headers: this.getHeaders() }
      );

      const result = response.data.data;

      return {
        success: true,
        reference: data.reference,
        paymentUrl: result.authorization_url,
        accessCode: result.access_code,
        ussdCode: result.ussd_code || null,
      };
    } catch (error: any) {
      logger.error('Paystack collection failed:', error.response?.data || error.message);
      throw Object.assign(
        new Error(error.response?.data?.message || 'Failed to initialize payment'),
        { statusCode: error.response?.status || 500 }
      );
    }
  }

  /**
   * Verify a payment by reference
   */
  async verifyPayment(reference: string): Promise<{
    verified: boolean;
    transactionId?: string;
    amount?: number;
    channel?: string;
    authorizationCode?: string;
  }> {
    try {
      const response = await axios.get(
        `${PAYSTACK_CONFIG.BASE_URL}${PAYSTACK_CONFIG.ENDPOINTS.VERIFY_TRANSACTION}/${reference}`,
        { headers: this.getHeaders() }
      );

      const { status, amount, channel, authorization, id } = response.data.data;

      return {
        verified: status === 'success',
        transactionId: id.toString(),
        amount: toGHS(amount),
        channel,
        authorizationCode: authorization?.authorization_code || null,
      };
    } catch (error: any) {
      logger.error('Paystack verification failed:', error.message);
      return { verified: false };
    }
  }

  /**
   * Create a transfer recipient for disbursements
   */
  async createTransferRecipient(data: {
    name: string;
    accountNumber: string;
    bankCode: string; // 'MTN', 'VOD', 'ATL', or bank code
    type?: 'mobile_money' | 'nuban';
  }): Promise<{
    success: boolean;
    recipientCode?: string;
  }> {
    try {
      const response = await axios.post(
        `${PAYSTACK_CONFIG.BASE_URL}${PAYSTACK_CONFIG.ENDPOINTS.CREATE_TRANSFER_RECIPIENT}`,
        {
          type: data.type || 'mobile_money',
          name: data.name,
          account_number: data.accountNumber,
          bank_code: data.bankCode,
          currency: 'GHS',
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        recipientCode: response.data.data.recipient_code,
      };
    } catch (error: any) {
      logger.error('Create recipient failed:', error.response?.data || error.message);
      throw Object.assign(
        new Error(error.response?.data?.message || 'Failed to create transfer recipient'),
        { statusCode: error.response?.status || 500 }
      );
    }
  }

  /**
   * Execute bulk disbursement to multiple recipients
   * This is the CORE method for daily payout distribution
   */
  async bulkDisburse(transfers: DisbursementRequest[]): Promise<BulkDisbursementResult> {
    try {
      const response = await axios.post(
        `${PAYSTACK_CONFIG.BASE_URL}${PAYSTACK_CONFIG.ENDPOINTS.BULK_TRANSFER}`,
        {
          source: 'balance',
          transfers: transfers.map(t => ({
            recipient: t.recipientCode,
            amount: toPesewas(t.amount),
            reference: t.reference,
            reason: t.reason,
          })),
        },
        { headers: this.getHeaders() }
      );

      const result = response.data.data;

      return {
        success: true,
        batchId: result.batch_id,
        transfers: transfers.map(t => ({
          success: true,
          reference: t.reference,
          amount: t.amount,
          recipientCode: t.recipientCode,
        })),
      };
    } catch (error: any) {
      logger.error('Bulk disbursement failed:', error.response?.data || error.message);
      
      // Return detailed failure info for retry logic
      return {
        success: false,
        transfers: transfers.map(t => ({
          success: false,
          reference: t.reference,
          amount: t.amount,
          recipientCode: t.recipientCode,
          error: error.response?.data?.message || error.message,
        })),
      };
    }
  }

  /**
   * Verify Paystack webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.SECRET_KEY)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }

  /**
   * Get or create recipient code for a user
   */
  async getOrCreateRecipientCode(
    userName: string,
    userPhone: string,
    channel: string = 'MTN'
  ): Promise<string> {
    // In production, check if user already has recipientCode in DB
    const result = await this.createTransferRecipient({
      name: userName,
      accountNumber: userPhone,
      bankCode: channel,
      type: 'mobile_money',
    });

    if (!result.success || !result.recipientCode) {
      throw new Error('Failed to create recipient');
    }

    return result.recipientCode;
  }
}

export const paymentService = new PaymentService();