// ============================================================
// i18n Navigation utilities
// Use these instead of next/link for locale-aware navigation
// ============================================================

import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
