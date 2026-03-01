// ============================================================
// TipstersKing i18n Configuration
// Supported locales: EN (default), ES, FR (V2)
// ============================================================

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

// Add 'fr' here when ready for V2
// export const locales = ['en', 'es', 'fr'] as const;
