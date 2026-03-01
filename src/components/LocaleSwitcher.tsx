'use client';

// ============================================================
// Locale Switcher Component
// Dropdown to switch between EN/ES
// ============================================================

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        className="appearance-none bg-transparent border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// Compact version for mobile
export function LocaleSwitcherCompact() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = locale === 'en' ? 'es' : 'en';

  return (
    <button
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 uppercase"
    >
      {nextLocale}
    </button>
  );
}
