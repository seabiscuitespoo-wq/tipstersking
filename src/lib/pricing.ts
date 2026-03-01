// ============================================================
// Geo-Pricing Configuration
// EUR: €9.99 | USD: $9.99 | GBP: £8.99
// ============================================================

export type Currency = 'eur' | 'usd' | 'gbp';

export interface PriceConfig {
  currency: Currency;
  amount: number; // in cents
  display: string;
  symbol: string;
  stripeId: string;
}

// Stripe Price IDs - UPDATE THESE WITH REAL IDS
const STRIPE_PRICES = {
  eur: process.env.STRIPE_PRICE_EUR || 'price_EUR_placeholder',
  usd: process.env.STRIPE_PRICE_USD || 'price_USD_placeholder',
  gbp: process.env.STRIPE_PRICE_GBP || 'price_GBP_placeholder',
};

export const PRICES: Record<Currency, PriceConfig> = {
  eur: {
    currency: 'eur',
    amount: 999,
    display: '€9.99',
    symbol: '€',
    stripeId: STRIPE_PRICES.eur,
  },
  usd: {
    currency: 'usd',
    amount: 999,
    display: '$9.99',
    symbol: '$',
    stripeId: STRIPE_PRICES.usd,
  },
  gbp: {
    currency: 'gbp',
    amount: 899,
    display: '£8.99',
    symbol: '£',
    stripeId: STRIPE_PRICES.gbp,
  },
};

// Country to currency mapping
const COUNTRY_CURRENCY: Record<string, Currency> = {
  // Eurozone
  AT: 'eur', BE: 'eur', CY: 'eur', EE: 'eur', FI: 'eur',
  FR: 'eur', DE: 'eur', GR: 'eur', IE: 'eur', IT: 'eur',
  LV: 'eur', LT: 'eur', LU: 'eur', MT: 'eur', NL: 'eur',
  PT: 'eur', SK: 'eur', SI: 'eur', ES: 'eur',
  // Other EU (use EUR)
  HR: 'eur', BG: 'eur', CZ: 'eur', DK: 'eur', HU: 'eur',
  PL: 'eur', RO: 'eur', SE: 'eur',
  
  // GBP countries
  GB: 'gbp', UK: 'gbp',
  
  // USD countries
  US: 'usd', CA: 'usd', AU: 'usd', NZ: 'usd',
  // Latin America (USD)
  MX: 'usd', BR: 'usd', AR: 'usd', CL: 'usd', CO: 'usd',
  // Asia (USD)
  JP: 'usd', KR: 'usd', SG: 'usd', HK: 'usd', TW: 'usd',
  IN: 'usd', PH: 'usd', TH: 'usd', VN: 'usd', MY: 'usd', ID: 'usd',
};

// Default currency for unknown countries
const DEFAULT_CURRENCY: Currency = 'eur';

/**
 * Detect currency from country code
 */
export function getCurrencyFromCountry(countryCode: string | null): Currency {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

/**
 * Get price config for a currency
 */
export function getPriceConfig(currency: Currency): PriceConfig {
  return PRICES[currency];
}

/**
 * Get price config from country code
 */
export function getPriceFromCountry(countryCode: string | null): PriceConfig {
  const currency = getCurrencyFromCountry(countryCode);
  return PRICES[currency];
}

/**
 * Get country code from request headers
 * Supports Vercel, Cloudflare, and standard headers
 */
export function getCountryFromHeaders(headers: Headers): string | null {
  return (
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    headers.get('x-country-code') ||
    null
  );
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    eur: '€',
    usd: '$',
    gbp: '£',
  };
  return `${symbols[currency]}${(amount / 100).toFixed(2)}`;
}
