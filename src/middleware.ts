// ============================================================
// TipstersKing Middleware
// Handles i18n locale detection + routing
// ============================================================

import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show prefix for non-default locales
});

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Static files (/_next/*, /favicon.ico, etc.)
  // - Public assets (/images/*, etc.)
  // - Success page (Stripe redirect)
  matcher: [
    '/((?!api|_next|_vercel|success|.*\\..*).*)',
  ],
};
