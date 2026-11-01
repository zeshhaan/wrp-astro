/**
 * The portfolio page's photos, grouped by the detailing work they show.
 *
 * Nothing here is a hand-kept list of portfolio photos. The page gathers the
 * photos the site already uses, wherever a `portfolio` switch says so:
 *
 *  - service pages (src/content/services/*.mdx): every "Real-time client work"
 *    photo (`realTimeWork.items`) unless that item says `portfolio: false`,
 *    and any `additionalSection.cards` photo that says `portfolio: true`;
 *  - blog posts (src/content/blog/*.md): the hero photo when the post says
 *    `portfolio: true`, under the post's first related service;
 *  - reviews (data/google-reviews.json): a review's photos when it says
 *    `"portfolio": true` (all of them) or `"portfolio": [1, 3]` (photo
 *    numbers), under its first service tag;
 *  - the portfolio projects (src/content/portfolio/*.md), under their first
 *    service, after the photos above.
 *
 * The switches live in the English files; the Arabic page reads the same
 * switches and uses the Arabic titles where an Arabic twin exists.
 * A photo used in more than one place is shown once.
 */
import { getCollection } from 'astro:content';
import { getAllReviews } from '@/lib/reviews';
import { getLocalizedPortfolio } from '@/i18n/content';
import { localizeUrl } from '@/i18n/utils';
import { t, type Locale, type TranslationKey } from '@/i18n/translations';

/** The order the services appear in on the page (car wash last, as in the navigation). */
const ORDER = ['paint-protection-film', 'ceramic-coating', 'window-film', 'polish', 'leather-upholstery', 'premium-car-wash'] as const;
type ServiceSlug = (typeof ORDER)[number];
const isService = (s: string | undefined): s is ServiceSlug => !!s && (ORDER as readonly string[]).includes(s);

/** Short service names from the navigation (translations `nav.service.*`). */
const shortKey: Record<ServiceSlug, TranslationKey> = {
  'paint-protection-film': 'nav.service.ppf',
  'ceramic-coating': 'nav.service.ceramicCoating',
  'window-film': 'nav.service.windowFilm',
  polish: 'nav.service.polish',
  'premium-car-wash': 'nav.service.carWash',
  'leather-upholstery': 'nav.service.upholstery',
};

export type WorkPhoto = {
  /** Image path without extension; Picture adds -480w.webp and so on. */
  base: string;
  /** Responsive widths that exist for this photo in /public. */
  widths: number[];
  width: number;
  height: number;
  alt: string;
  title: string;
  /** Where the photo comes from, e.g. "Blog" or "Verified Google Review". */
  note?: string;
};

export type WorkGroup = {
  slug: ServiceSlug;
  /** The service page's title, e.g. "Paint Protection Film (PPF)". */
  name: string;
  short: string;
  href: string;
  photos: WorkPhoto[];
  /** Index of this group's first photo in the one lightbox sequence. */
  start: number;
};

const stripExt = (src: string) => src.replace(/^\/?/, '/').replace(/\.(webp|jpe?g|png|avif)$/i, '');

/** Variant widths per folder, as scripts/optimize-images.mjs makes them. */
function widthsOf(base: string): number[] {
  if (base.startsWith('/review-images/')) return [480, 800];
  if (/^\/[^/]+$/.test(base)) return [480, 800, 1920]; // homepage/blog heroes in /public
  return [480, 800, 1200];
}

/** A photo of the work, or null if this path was already used. */
function photo(seen: Set<string>, src: string, rest: Omit<WorkPhoto, 'base' | 'widths' | 'width' | 'height'> & { width?: number; height?: number }): WorkPhoto | null {
  const base = stripExt(src);
  if (seen.has(base)) return null;
  seen.add(base);
  const portrait = base.startsWith('/review-images/') || base.startsWith('/portfolio/');
  return { base, widths: widthsOf(base), width: rest.width ?? (portrait ? 900 : 1200), height: rest.height ?? (portrait ? 1200 : 900), ...rest };
}

export async function loadWork(locale: Locale) {
  const ar = locale === 'ar';
  const seen = new Set<string>();
  const buckets = new Map<ServiceSlug, WorkPhoto[]>(ORDER.map((s) => [s, []]));
  const add = (slug: string | undefined, p: WorkPhoto | null) => {
    if (p && isService(slug)) buckets.get(slug)!.push(p);
  };

  const services = await getCollection('services');
  const serviceEn = (slug: string) => services.find((s) => s.id === slug);
  const serviceLocal = (slug: string) => services.find((s) => s.id === (ar ? `ar/${slug}` : slug)) ?? serviceEn(slug);

  // 1. Service pages: client work galleries, then switched-on cards.
  for (const slug of ORDER) {
    const en = serviceEn(slug);
    if (!en) continue;
    const local = serviceLocal(slug)!;
    for (const item of en.data.realTimeWork?.items ?? []) {
      if (!item.portfolio) continue;
      const localItem = local.data.realTimeWork?.items.find((i) => i.image === item.image) ?? item;
      add(slug, photo(seen, item.image, { title: localItem.title ?? local.data.title, alt: localItem.alt ?? item.alt ?? `${local.data.title} - WRP Detailing Studio, Dubai` }));
    }
    (en.data.additionalSection?.cards ?? []).forEach((card, k) => {
      if (!card.portfolio || !card.image) return;
      const localCard = local.data.additionalSection?.cards[k] ?? card;
      add(slug, photo(seen, card.image, { title: localCard.title, alt: localCard.imageAlt ?? card.imageAlt ?? localCard.title }));
    });
  }

  // 2. Blog posts with `portfolio: true`.
  const posts = await getCollection('blog');
  for (const post of posts.filter((p) => !p.id.startsWith('ar/') && p.data.portfolio && p.data.heroImage)) {
    const local = ar ? (posts.find((p) => p.id === `ar/${post.id}`) ?? post) : post;
    add(post.data.relatedServices[0], photo(seen, post.data.heroImage!, { title: local.data.title, alt: local.data.title, note: t(locale, 'blog.title') }));
  }

  // 3. Review photos that are switched on.
  for (const review of getAllReviews()) {
    if (!review.portfolio || !review.localImages?.length) continue;
    const slug = review.serviceTags?.find(isService);
    if (!slug) continue;
    const numbers = review.portfolio === true ? review.localImages.map((_, k) => k + 1) : review.portfolio;
    const service = serviceLocal(slug)?.data.title ?? slug;
    for (const n of numbers) {
      const src = review.localImages[n - 1];
      if (!src) continue;
      add(
        slug,
        photo(seen, `/${src}`, {
          title: review.reviewerName,
          note: t(locale, 'reviews.verified'),
          alt: ar ? `صورة من تقييم ${review.reviewerName} على Google: ${service} في WRP Detailing Studio، دبي` : `Customer photo from ${review.reviewerName}'s Google review: ${service} at WRP Detailing Studio, Dubai`,
        }),
      );
    }
  }

  // 4. The portfolio projects (showroom and event photos), last in their group.
  const projects = (await getLocalizedPortfolio(locale)).sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.completionDate.getTime() - a.data.completionDate.getTime();
  });
  for (const p of projects) {
    for (const src of p.data.gallery) {
      add(
        p.data.services.find(isService),
        photo(seen, src, {
          title: p.data.title,
          note: p.data.subtitle,
          alt: `${p.data.title} ${p.data.subtitle} - Professional car detailing work completed at WRP Detailing Studio luxury automotive studio`,
        }),
      );
    }
  }

  let start = 0;
  const groups: WorkGroup[] = [];
  for (const slug of ORDER) {
    const photos = buckets.get(slug)!;
    if (!photos.length) continue;
    groups.push({
      slug,
      name: serviceLocal(slug)?.data.title ?? slug,
      short: t(locale, shortKey[slug]),
      href: localizeUrl(`/services/${slug}/`, locale),
      photos,
      start,
    });
    start += photos.length;
  }

  const big = (p: WorkPhoto) => `${p.base}-${p.widths[p.widths.length - 1]}w.webp`;
  const slides = groups.flatMap((g) => g.photos.map((p) => ({ src: big(p), thumb: `${p.base}-480w.webp`, title: p.title, subtitle: [g.short, p.note].filter(Boolean).join(' · ') })));

  return { groups, slides, viewService: t(locale, 'services.viewService') };
}
