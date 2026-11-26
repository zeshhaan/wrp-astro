import type { CollectionEntry } from 'astro:content';
import { getBaseSlug, getLocalizedBlogPosts } from '@/i18n/content';
import type { Locale } from '@/i18n/translations';

/** What a route file in src/pages passes to SitePage.astro. */
export type SitePageProps =
  | { kind: 'home' | 'about' | 'contact' | 'reviews' | 'portfolio' | 'blog'; locale: Locale; slug?: '' }
  | { kind: 'pillar'; locale: Locale; slug: 'wrap' | 'reinforce' | 'protect' }
  | { kind: 'legal'; locale: Locale; slug: 'privacy' | 'terms' | 'credits' }
  | { kind: 'post'; locale: Locale; slug: string; post: CollectionEntry<'blog'> };

/**
 * The blog post routes' getStaticPaths: English posts at /blog/<id>/; Arabic
 * at /ar/blog/<id>/ once an Arabic entry exists.
 */
export async function blogPostPaths(locale: Locale) {
  const posts = await getLocalizedBlogPosts(locale);
  return posts.map((post) => {
    const slug = getBaseSlug(post.id);
    return {
      params: { slug },
      props: { kind: 'post', locale, slug, post } satisfies SitePageProps,
    };
  });
}
