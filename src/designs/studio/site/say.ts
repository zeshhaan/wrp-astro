import { localizeUrl, toLocalNum } from '@/i18n/utils';
import { t, type Locale, type TranslationKey } from '@/i18n/translations';

/**
 * Resolves a copy string from content/*.ts the way the live page renders it:
 * "@t:key" is a translations.ts key and "@n:value" a number in the page's
 * numerals (Eastern Arabic on Arabic pages); anything else is the text itself.
 */
export function say(locale: Locale, s: string): string {
  if (s.startsWith('@t:')) return t(locale, s.slice(3) as TranslationKey);
  if (s.startsWith('@n:')) return toLocalNum(s.slice(3), locale);
  return s;
}

/** Breadcrumbs as the live pages publish them: absolute live URLs, names resolved. */
export function trail(locale: Locale, names: string[], paths: string[]) {
  return names.map((name, i) => ({ name: say(locale, name), url: `https://wrpdetailing.ae${localizeUrl(paths[i], locale)}` }));
}
