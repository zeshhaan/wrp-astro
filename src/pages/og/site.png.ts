/**
 * Default Open Graph card, used by every page that is neither a blog post nor a
 * service: the homepage, the pillar pages, about, contact, reviews, legal.
 *
 * Accepts `?title=` and `?eyebrow=` so a page can label its own card without
 * needing a route of its own. Values
 * are clamped in `createOgCard`, and anything unsupplied falls back to the
 * brand line, so a malformed query yields a plain WRP card rather than an error.
 */
import type { APIRoute } from 'astro';
import { createOgCard } from '../../lib/og';

export const prerender = false;

// 1200x675, so it covers 1200x630 with a small vertical crop and no upscaling
// (the luxury-* stock is 1024x1024 and would have to be blown up). Chosen over
// the studio shots because those contain the WRP wall sign, which collides with
// the wordmark this card draws: two lockups in one frame reads as a mistake.
// Dark bodywork also carries white type better than the white Cullinan did.
const HERO = '/stek-vs-avery-hero.jpg';

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title')?.slice(0, 160);
  const eyebrow = url.searchParams.get('eyebrow')?.slice(0, 60);

  return createOgCard({
    eyebrow: eyebrow || 'Dubai, UAE',
    title: title || 'Premium Car Detailing Studio in Dubai',
    subtitle: 'Paint protection film, ceramic coating, window tinting and paint correction.',
    imageUrl: new URL(HERO, url).toString(),
  });
};
