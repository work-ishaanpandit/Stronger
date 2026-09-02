export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR — ₹ — Indian Rupee' },
  { code: 'EUR', symbol: '€', label: 'EUR — € — Euro' },
  { code: 'USD', symbol: '$', label: 'USD — $ — US Dollar' },
  { code: 'GBP', symbol: '£', label: 'GBP — £ — British Pound' },
];

export function getCurrencySymbol(code = 'INR') {
  if (!code) return '₹';
  const found = CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found ? found.symbol : '₹';
}
