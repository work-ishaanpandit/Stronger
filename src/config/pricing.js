// Centralized Configurable Subscription Pricing Structure
export const PRICING_CONFIG = {
  currency: 'INR',
  currencySymbol: '₹',
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    price: 100,
    periodMonths: 1,
  },
  yearly: {
    id: 'yearly',
    label: 'Yearly',
    price: 1000,
    periodMonths: 12,
  },
};

/**
 * Get effective price for a user considering custom price overrides.
 */
export function getEffectivePrice(plan, profile) {
  const isYearly = plan === 'yearly';
  const standardPrice = isYearly ? PRICING_CONFIG.yearly.price : PRICING_CONFIG.monthly.price;
  const customPrice = isYearly ? profile?.custom_yearly_price : profile?.custom_monthly_price;

  if (customPrice !== null && customPrice !== undefined && !isNaN(Number(customPrice))) {
    return Number(customPrice);
  }
  return standardPrice;
}
