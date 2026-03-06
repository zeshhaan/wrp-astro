/**
 * Helpers for locale-aware content collection queries.
 * Content files with lang: 'ar' are Arabic; everything else is English.
 */

import { getCollection } from 'astro:content';
import type { Locale } from './translations';

/**
 * Get blog posts filtered by locale.
 * Arabic posts have IDs prefixed with 'ar/' (they live in src/content/blog/ar/).
 */
export async function getLocalizedBlogPosts(locale: Locale) {
  const allPosts = await getCollection('blog');
  if (locale === 'ar') {
    return allPosts.filter((post) => post.id.startsWith('ar/'));
  }
  return allPosts.filter((post) => !post.id.startsWith('ar/'));
}

/**
 * Get services filtered by locale.
 * Arabic services have IDs prefixed with 'ar/'.
 */
export async function getLocalizedServices(locale: Locale) {
  const allServices = await getCollection('services');
  if (locale === 'ar') {
    return allServices.filter((s) => s.id.startsWith('ar/'));
  }
  return allServices.filter((s) => !s.id.startsWith('ar/'));
}

/**
 * Get portfolio entries filtered by locale.
 * Arabic entries have IDs prefixed with 'ar/'.
 */
export async function getLocalizedPortfolio(locale: Locale) {
  const allEntries = await getCollection('portfolio');
  if (locale === 'ar') {
    return allEntries.filter((e) => e.id.startsWith('ar/'));
  }
  return allEntries.filter((e) => !e.id.startsWith('ar/'));
}

/**
 * Get the base slug from a content ID (strip locale prefix and file extension).
 * 'ar/ceramic-coating' → 'ceramic-coating'
 * 'ceramic-coating' → 'ceramic-coating'
 */
export function getBaseSlug(id: string): string {
  return id.replace(/^ar\//, '');
}
