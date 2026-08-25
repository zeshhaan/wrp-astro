/**
 * Per-service Open Graph card.
 *
 * The service is selected with `?slug=`, not a path segment, because this site
 * runs `trailingSlash: 'always'`. Astro exempts a STATIC route ending in an
 * extension from that rule but not a dynamic one, so `og/service/[slug].png`
 * compiles to a pattern requiring `.png/` and 404s on the natural URL. A static
 * path with a query sidesteps it and keeps the URL scrapers see conventional.
 *
 * SSR rather than prerendered: only scrapers fetch these, so rendering on
 * demand and caching at the edge beats emitting 12 PNGs on every deploy.
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { createOgCard } from '../../lib/og';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Missing slug', { status: 400 });

  const entry = await getEntry('services', slug);
  if (!entry) return new Response('Not found', { status: 404 });

  const d = entry.data;
  return createOgCard({
    eyebrow: d.subtitle,
    title: d.heroTitle || d.title,
    subtitle: d.heroDescription || d.description,
    imageUrl: d.heroImage ? new URL(d.heroImage, url).toString() : undefined,
    badge: d.startingPrice ? `From AED ${d.startingPrice}` : undefined,
  });
};
