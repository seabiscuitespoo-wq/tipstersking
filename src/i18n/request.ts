// ============================================================
// next-intl request configuration (App Router)
// ============================================================

import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load all translation files and merge them
  const common = (await import(`../../locales/${locale}/common.json`)).default;
  const dashboard = (await import(`../../locales/${locale}/dashboard.json`)).default;
  const tipster = (await import(`../../locales/${locale}/tipster.json`)).default;

  return {
    locale,
    messages: {
      ...common,
      dashboard,
      tipster,
    },
  };
});
