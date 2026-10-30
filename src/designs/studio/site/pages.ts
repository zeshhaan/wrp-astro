import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/translations';

/** What a route file in src/pages passes to SitePage.astro. */
export type SitePageProps =
  | { kind: 'home' | 'about' | 'contact' | 'reviews' | 'portfolio' | 'blog'; locale: Locale; slug?: '' }
  | { kind: 'pillar'; locale: Locale; slug: 'wrap' | 'reinforce' | 'protect' }
  | { kind: 'legal'; locale: Locale; slug: 'privacy' | 'terms' | 'credits' }
  | { kind: 'post'; locale: Locale; slug: string; post: CollectionEntry<'blog'> };

/**
 * The blog post routes' getStaticPaths: English posts at /blog/<id>/; Arabic
 * at /ar/blog/<id>/, falling back to the English post where there is no
 * translation.
 */
export async function blogPostPaths(locale: Locale) {
  const posts = await getCollection('blog');
  const arPosts = posts.filter((p) => p.id.startsWith('ar/'));
  const enPosts = posts.filter((p) => !p.id.startsWith('ar/'));
  const arSlugs = new Set(arPosts.map((p) => p.id.replace('ar/', '')));
  const list =
    locale === 'en'
      ? enPosts.map((post) => ({ slug: post.id, post }))
      : [
          ...arPosts.map((post) => ({ slug: post.id.replace('ar/', ''), post })),
          ...enPosts.filter((p) => !arSlugs.has(p.id)).map((post) => ({ slug: post.id, post })),
        ];
  return list.map(({ slug, post }) => ({
    params: { slug },
    props: { kind: 'post', locale, slug, post } satisfies SitePageProps,
  }));
}
