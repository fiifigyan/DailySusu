/**
 * XSUSU SYSTEM RULES
 * 
 * These rules are HARDCODED and ENFORCED by the backend.
 * No group admin can modify these values.
 * This prevents exploitation and ensures fairness for all members.
 */

export const SUSU_RULES = {
  // ============================================
  // SURPLUS ALLOCATION RULES
  // Percentages must total 100%
  // ============================================
  SURPLUS_ALLOCATION: {
    APP_MAINTENANCE: 40,      // Goes to app owner (your revenue)
    EMERGENCY_FUND: 35,       // Group emergency savings
    SAVINGS_POOL: 15,         // Group long-term savings
    ADMIN_COMPENSATION: 10,   // Group admin's management fee
  },

  // ============================================
  // VALIDATION RULES
  // ============================================
  MIN_MEMBERS: 2,
  MAX_MEMBERS: 100,
  MIN_CONTRIBUTION: 1,         // GHS 1 minimum daily contribution
  MAX_CONTRIBUTION: 1000,      // GHS 1000 maximum daily contribution
  MIN_SURPLUS_PERCENTAGE: 2,   // Surplus must be at least 2% of collection
  MAX_SURPLUS_PERCENTAGE: 20,  // Surplus cannot exceed 20% of collection

  // ============================================
  // PAYSTACK FEE ESTIMATES (for display purposes)
  // ============================================
  PAYSTACK_COLLECTION_FEE_PERCENT: 1.95,  // 1.95% per collection
  PAYSTACK_DISBURSEMENT_FEE_FLAT: 10,      // GHS 10 per bulk disbursement
  PAYSTACK_VAT: 15,                        // 15% VAT on fees

  // ============================================
  // APP FEE (Not used - members pay nothing extra)
  // ============================================
  MEMBER_APP_FEE: 0,  // Always 0 - no monthly fees for members
};

/**
 * Calculate surplus breakdown based on system rules
 * This is the single source of truth for all calculations
 */
export function calculateSurplusBreakdown(
  memberCount: number,
  dailyContribution: number,
  dailyPayout: number
): {
  totalCollection: number;
  dailySurplus: number;
  surplusPercentage: number;
  allocation: {
    appMaintenance: number;
    emergencyFund: number;
    savingsPool: number;
    adminCompensation: number;
  };
  fees: {
    collectionFee: number;
    disbursementFee: number;
    totalFees: number;
    netAfterFees: number;
  };
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate inputs
  if (memberCount < SUSU_RULES.MIN_MEMBERS) {
    errors.push(`Minimum ${SUSU_RULES.MIN_MEMBERS} members required`);
  }
  if (memberCount > SUSU_RULES.MAX_MEMBERS) {
    errors.push(`Maximum ${SUSU_RULES.MAX_MEMBERS} members allowed`);
  }
  if (dailyContribution < SUSU_RULES.MIN_CONTRIBUTION) {
    errors.push(`Minimum contribution is GHS ${SUSU_RULES.MIN_CONTRIBUTION}`);
  }
  if (dailyContribution > SUSU_RULES.MAX_CONTRIBUTION) {
    errors.push(`Maximum contribution is GHS ${SUSU_RULES.MAX_CONTRIBUTION}`);
  }

  // Calculate totals
  const totalCollection = memberCount * dailyContribution;
  const dailySurplus = totalCollection - dailyPayout;
  const surplusPercentage = totalCollection > 0 
    ? (dailySurplus / totalCollection) * 100 
    : 0;

  // Validate surplus
  if (dailySurplus < 0) {
    errors.push('Daily payout exceeds total collection');
  }
  if (surplusPercentage < SUSU_RULES.MIN_SURPLUS_PERCENTAGE) {
    errors.push(`Surplus must be at least ${SUSU_RULES.MIN_SURPLUS_PERCENTAGE}% of collection`);
  }
  if (surplusPercentage > SUSU_RULES.MAX_SURPLUS_PERCENTAGE) {
    errors.push(`Surplus cannot exceed ${SUSU_RULES.MAX_SURPLUS_PERCENTAGE}% of collection`);
  }

  // Calculate Paystack fees
  const collectionFee = totalCollection * (SUSU_RULES.PAYSTACK_COLLECTION_FEE_PERCENT / 100);
  const collectionFeeWithVAT = collectionFee * (1 + SUSU_RULES.PAYSTACK_VAT / 100);
  const disbursementFee = SUSU_RULES.PAYSTACK_DISBURSEMENT_FEE_FLAT;
  const totalFees = collectionFeeWithVAT + disbursementFee;
  const netAfterFees = totalCollection - totalFees;
  const netSurplus = netAfterFees - dailyPayout;

  // Calculate allocation based on NET surplus (after fees)
  const allocation = {
    appMaintenance: roundToPesewa(netSurplus * (SUSU_RULES.SURPLUS_ALLOCATION.APP_MAINTENANCE / 100)),
    emergencyFund: roundToPesewa(netSurplus * (SUSU_RULES.SURPLUS_ALLOCATION.EMERGENCY_FUND / 100)),
    savingsPool: roundToPesewa(netSurplus * (SUSU_RULES.SURPLUS_ALLOCATION.SAVINGS_POOL / 100)),
    adminCompensation: roundToPesewa(netSurplus * (SUSU_RULES.SURPLUS_ALLOCATION.ADMIN_COMPENSATION / 100)),
  };

  return {
    totalCollection,
    dailySurplus: roundToPesewa(dailySurplus),
    surplusPercentage: roundToPesewa(surplusPercentage),
    allocation,
    fees: {
      collectionFee: roundToPesewa(collectionFeeWithVAT),
      disbursementFee,
      totalFees: roundToPesewa(totalFees),
      netAfterFees: roundToPesewa(netAfterFees),
    },
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Round to 2 decimal places (pesewas)
 */
function roundToPesewa(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Generate the surplusUse JSON string for storage
 */
export function generateSurplusUseJson(breakdown: ReturnType<typeof calculateSurplusBreakdown>): string {
  return JSON.stringify({
    version: '1.0',
    rules: SUSU_RULES.SURPLUS_ALLOCATION,
    allocation: breakdown.allocation,
    fees: breakdown.fees,
    dailySurplus: breakdown.dailySurplus,
    surplusPercentage: breakdown.surplusPercentage,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Parse surplusUse JSON string for display
 */
export function parseSurplusUse(surplusUse: string | null): any {
  if (!surplusUse) return null;
  try {
    return JSON.parse(surplusUse);
  } catch {
    return null;
  }
}