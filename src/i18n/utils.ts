/**
 * i18n utility functions for locale detection, URL manipulation, and SEO helpers.
 */

import type { Locale } from './translations';

/** Extract locale from Astro.currentLocale or default to 'en'. */
export function getLocale(currentLocale: string | undefined): Locale {
  return currentLocale === 'ar' ? 'ar' : 'en';
}

/** Get text direction for the locale. */
export function getDir(locale: Locale | string | undefined): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Get OG locale string (e.g. 'en_AE', 'ar_AE'). */
export function getOgLocale(locale: Locale | string | undefined): string {
  return locale === 'ar' ? 'ar_AE' : 'en_AE';
}

/**
 * Prefix a URL path with the locale prefix.
 * English paths stay as-is (no prefix), Arabic paths get /ar/ prefix.
 */
export function localizeUrl(path: string, locale: Locale | string | undefined): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === 'ar') {
    // Don't double-prefix
    if (cleanPath.startsWith('/ar/') || cleanPath === '/ar') return cleanPath;
    return `/ar${cleanPath}`;
  }

  // English: strip /ar/ prefix if present
  if (cleanPath.startsWith('/ar/')) return cleanPath.slice(3);
  if (cleanPath === '/ar') return '/';
  return cleanPath;
}

/**
 * Get the alternate URL for the current page in the other locale.
 * Used for hreflang tags and language switcher.
 */
export function getAlternateUrl(pathname: string, currentLocale: Locale | string | undefined): string {
  if (currentLocale === 'ar') {
    // Current is Arabic → alternate is English (strip /ar prefix)
    return localizeUrl(pathname, 'en');
  }
  // Current is English → alternate is Arabic (add /ar prefix)
  return localizeUrl(pathname, 'ar');
}

/**
 * Strip the locale prefix from a path to get the base path.
 * /ar/services/ceramic-coating/ → /services/ceramic-coating/
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname.startsWith('/ar/')) return pathname.slice(3);
  if (pathname === '/ar') return '/';
  return pathname;
}

/**
 * Get the date format locale string for Intl APIs.
 */
export function getDateLocale(locale: Locale | string | undefined): string {
  return locale === 'ar' ? 'ar-AE' : 'en-AE';
}

/**
 * Convert Western digits (0-9) to Eastern Arabic numerals (٠-٩) for Arabic locale.
 * Leaves non-digit characters (., +, %, etc.) unchanged.
 */
export function toLocalNum(n: string | number, locale: Locale | string | undefined): string {
  const s = String(n);
  return locale === 'ar' ? s.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]) : s;
}
