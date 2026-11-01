/**
 * The portfolio's projects as every portfolio design reads them: the same
 * entries, order and words as the live page (featured first, then newest),
 * plus what the entries already hold but the first Studio version did not
 * show: each project's one-line description and its services (named and
 * linked as the site's navigation names them).
 */
import { getLocalizedPortfolio } from '@/i18n/content';
import { getImageDimensions } from '@/utils/image-dimensions';
import { localizeUrl } from '@/i18n/utils';
import { t, type Locale, type TranslationKey } from '@/i18n/translations';

/** The live navigation's short service names (translations `nav.service.*`). */
const shortKey: Record<string, TranslationKey> = {
  'paint-protection-film': 'nav.service.ppf',
  'ceramic-coating': 'nav.service.ceramicCoating',
  'window-film': 'nav.service.windowFilm',
  polish: 'nav.service.polish',
  'premium-car-wash': 'nav.service.carWash',
  'leather-upholstery': 'nav.service.upholstery',
};

export type PortfolioService = { slug: string; name: string; href: string };

export type PortfolioProject = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  featured: boolean;
  services: PortfolioService[];
  /** Image base path without extension (Picture adds -480w.webp and so on). */
  hero: string;
  heroSize: { width: number; height: number };
  gallery: string[];
  /** The alt text the live page gives the project's photo. */
  alt: string;
  /** Where this project's photos start in the one lightbox sequence. */
  start: number;
};

export type Slide = { src: string; title: string; subtitle: string };

export const base = (src: string) => src.replace(/\.(webp|jpe?g|png|avif)$/i, '');

/** Small interface words the designs add (labels for filters and buttons). */
const words = {
  en: { all: 'All', photos: 'photos', view: 'View photos', of: 'of', services: 'Services', drag: 'Drag', open: 'Open' },
  ar: { all: 'الكل', photos: 'صور', view: 'عرض الصور', of: 'من', services: 'الخدمات', drag: 'اسحب', open: 'افتح' },
};
export type PortfolioWords = (typeof words)['en'];

export async function loadPortfolio(locale: Locale) {
  const entries = (await getLocalizedPortfolio(locale)).sort((a, b) => {
    if (a.data.featured && !b.data.featured) return -1;
    if (!a.data.featured && b.data.featured) return 1;
    return b.data.completionDate.getTime() - a.data.completionDate.getTime();
  });

  let start = 0;
  const projects: PortfolioProject[] = entries.map((entry) => {
    const d = entry.data;
    const project: PortfolioProject = {
      id: entry.id.replace(/^ar\//, ''),
      title: d.title,
      subtitle: d.subtitle,
      description: d.description,
      featured: d.featured,
      services: d.services
        .filter((slug) => slug in shortKey)
        .map((slug) => ({ slug, name: t(locale, shortKey[slug]), href: localizeUrl(`/services/${slug}/`, locale) })),
      hero: base(d.heroImage),
      heroSize: getImageDimensions(d.heroImage),
      gallery: d.gallery.map(base),
      alt: `${d.title} ${d.subtitle} - Professional car detailing work completed at WRP Detailing Studio luxury automotive studio`,
      start,
    };
    start += d.gallery.length;
    return project;
  });

  const slides: Slide[] = projects.flatMap((p) => p.gallery.map((g) => ({ src: `${g}-1200w.webp`, title: p.title, subtitle: p.subtitle })));

  // Services that appear in the work, most-used first, for filters.
  const counts = new Map<string, { service: PortfolioService; count: number }>();
  for (const p of projects)
    for (const s of p.services) counts.set(s.slug, { service: s, count: (counts.get(s.slug)?.count ?? 0) + 1 });
  const services = [...counts.values()].sort((a, b) => b.count - a.count);

  return { projects, slides, services, words: words[locale] };
}

export type PortfolioData = Awaited<ReturnType<typeof loadPortfolio>>;
