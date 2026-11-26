/**
 * Server-side: everything the quote flow shows, read from data.ts and the
 * localized service .mdx files, flattened to plain JSON for the client.
 *
 * Price rules (same as the live site): only data.ts `from` prices and the wash
 * levels (the one page with showPackages: true) are shown. Package prices in the
 * PPF / ceramic / polish / tint .mdx are NOT shown; we use their names and
 * inclusions only.
 */
import { quoteLabel } from './labels';
import type { Locale } from '@/i18n/translations';
import { getCollection, type CollectionEntry } from 'astro:content';
import { contact, proof, services } from '../../data';
import { ppfPresets, tintOptions } from './panels';
import type { Catalog, ServiceId } from './state';

type Svc = CollectionEntry<'services'>;

const bySlug = (slug: string) => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`quote: missing service ${slug}`);
  return s;
};

export async function buildCatalog(locale: Locale = 'en'): Promise<Catalog> {
  const all = await getCollection('services');
  const mdx = (slug: string) => {
    const e = all.find((x) => x.id === slug || x.id === `${slug}.mdx`);
    if (!e) throw new Error(`quote: missing ${slug}.mdx`);
    return e.data;
  };
  const ppf = mdx('paint-protection-film');
  const prefix = locale === 'ar' ? 'ar/' : '';
  const label = (text: string) => quoteLabel(text, locale);
  const ceramic = mdx('ceramic-coating');
  const ceramicCopy = mdx(prefix + 'ceramic-coating');
  const polish = mdx(prefix + 'polish');
  const wash = mdx('premium-car-wash');
  const washCopy = mdx(prefix + 'premium-car-wash');
  const tint = mdx('window-film');

  const feat = (d: Svc['data'], name: string) => d.packages?.find((p) => p.name === name)?.features ?? [];

  const svc = (id: ServiceId, slug: string | null, over: Partial<Catalog['services'][number]> = {}) => {
    const s = slug ? bySlug(slug) : null;
    const service = {
      id,
      name: s?.name ?? '',
      short: s?.short ?? '',
      from: s?.from ?? null,
      time: s?.time ?? 'Confirmed after inspection',
      minutes: s?.minutes ?? 0,
      href: s?.href ?? '/contact-us/',
      line: s?.line ?? '',
      ...over,
    };
    return { ...service, name: label(service.name), time: label(service.time) };
  };

  const washLevels = (wash.packages ?? []).map((p, i) => ({
    level: (i + 1) as 1 | 2 | 3,
    name: washCopy.packages?.[i]?.name ?? p.name,
    tagline: washCopy.packages?.[i]?.tagline ?? p.tagline ?? '',
    sedan: p.price,
    suv: (p as { priceSuv?: number }).priceSuv ?? p.price,
    features: p.features,
  }));

  return {
    locale,
    services: [
      svc('ppf', 'paint-protection-film', { name: 'Paint protection film', short: 'PPF', line: 'Clear, self-healing film that takes the stone chips.' }),
      svc('ceramic', 'ceramic-coating', { name: 'Ceramic coating', line: 'A hard glass layer that keeps the gloss and sheds dirt.' }),
      svc('polish', 'polish', { name: 'Polish & correction', short: 'Polish', line: 'Swirls and haze out, measured with a paint-depth gauge.' }),
      svc('wash', 'premium-car-wash', {
        name: 'Detailing & premium wash',
        short: 'Detailing',
        line: 'Hand wash to full Level 3 detail, inside and out.',
      }),
      svc('tint', 'window-film', { name: 'Window tint', short: 'Tint', line: 'Nano-ceramic film for heat, glare and privacy.' }),
      svc('interior', 'leather-upholstery', { name: 'Seats, upholstery & mats', short: 'Interior', line: 'Seat covers, stitched upholstery and fitted mats.' }),
      svc('wrap', null, {
        name: 'Wrap & styling',
        short: 'Wrap',
        from: null,
        line: 'Matte-black bonnet, roof or spoiler, chrome delete.',
        href: '/contact-us/',
      }),
    ],
    ppf: {
      presets: ppfPresets.map((p) => ({ ...p, name: label(p.name), note: label(p.note), features: feat(ppf, p.name) })),
      facts: bySlug('paint-protection-film').facts,
      films: proof.films,
      ceramicOnFilm: ceramic.faqs?.find((f) => /over PPF/i.test(f.question))?.answer ?? '',
    },
    ceramic: {
      packages: (ceramic.packages ?? []).map((p, i) => ({
        id: p.name.split(' ')[0].toLowerCase(),
        name: ceramicCopy.packages?.[i]?.name ?? p.name,
        features: ceramicCopy.packages?.[i]?.features ?? p.features,
      })),
      facts: bySlug('ceramic-coating').facts,
    },
    polish: {
      packages: (polish.packages ?? []).map((p) => ({ name: p.name, features: p.features })),
    },
    wash: { levels: washLevels },
    tint: {
      options: tintOptions.map((o) => ({ ...o, name: label(o.name), heat: label(o.heat), note: label(o.note), features: feat(tint, o.name) })),
    },
    contact: {
      whatsapp: contact.whatsapp,
      hours: locale === 'ar' ? 'نفتح من الساعة ٩ صباحاً حتى ٩:٣٠ مساءً كل يوم ما عدا الجمعة' : contact.hours,
      schedule: contact.schedule,
    },
  };
}
