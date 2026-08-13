export function calculateSurplus(
  memberCount: number,
  dailyContribution: number,
  dailyPayout: number
): {
  totalCollection: number;
  surplus: number;
  surplusPercentage: number;
  isValid: boolean;
  message: string;
} {
  const totalCollection = memberCount * dailyContribution;
  const surplus = totalCollection - dailyPayout;
  const surplusPercentage = (surplus / totalCollection) * 100;
  
  const isValid = surplus >= 0;
  
  return {
    totalCollection,
    surplus,
    surplusPercentage: Math.round(surplusPercentage * 100) / 100,
    isValid,
    message: isValid 
      ? `Surplus is ${surplusPercentage.toFixed(2)}% of daily collection`
      : 'Payout exceeds collection. Surplus cannot be negative.',
  };
}