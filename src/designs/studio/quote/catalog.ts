/**
 * Server-side: everything the quote flow shows, read from data.ts and the
 * English service .mdx files, flattened to plain JSON for the client.
 *
 * Price rules (same as the live site): only data.ts `from` prices and the wash
 * levels (the one page with showPackages: true) are shown. Package prices in the
 * PPF / ceramic / polish / tint .mdx are NOT shown; we use their names and
 * inclusions only.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { contact, freshQuotes, lounge, proof, services, whatsappLink } from '../../data';
import { ppfPresets, tintOptions } from './panels';
import type { Catalog, ServiceId } from './state';

type Svc = CollectionEntry<'services'>;

const bySlug = (slug: string) => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`quote: missing service ${slug}`);
  return s;
};

export async function buildCatalog(): Promise<Catalog> {
  const all = await getCollection('services', (e: Svc) => !e.id.startsWith('ar/'));
  const mdx = (slug: string) => {
    const e = all.find((x) => x.id === slug || x.id === `${slug}.mdx`);
    if (!e) throw new Error(`quote: missing ${slug}.mdx`);
    return e.data;
  };
  const ppf = mdx('paint-protection-film');
  const ceramic = mdx('ceramic-coating');
  const polish = mdx('polish');
  const wash = mdx('premium-car-wash');
  const tint = mdx('window-film');

  const feat = (d: Svc['data'], name: string) => d.packages?.find((p) => p.name === name)?.features ?? [];

  const svc = (id: ServiceId, slug: string | null, over: Partial<Catalog['services'][number]> = {}) => {
    const s = slug ? bySlug(slug) : null;
    return {
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
  };

  const washLevels = (wash.packages ?? []).map((p, i) => ({
    level: (i + 1) as 1 | 2 | 3,
    name: p.name,
    tagline: (p as { tagline?: string }).tagline ?? '',
    sedan: p.price,
    suv: (p as { priceSuv?: number }).priceSuv ?? p.price,
    features: p.features,
  }));

  return {
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
      presets: ppfPresets.map((p) => ({ ...p, features: feat(ppf, p.name) })),
      facts: bySlug('paint-protection-film').facts,
      films: proof.films,
      ceramicOnFilm: ceramic.faqs?.find((f) => /over PPF/i.test(f.question))?.answer ?? '',
    },
    ceramic: {
      packages: (ceramic.packages ?? []).map((p) => ({ id: p.name.split(' ')[0].toLowerCase(), name: p.name, features: p.features })),
      facts: bySlug('ceramic-coating').facts,
    },
    polish: {
      packages: (polish.packages ?? []).map((p) => ({ name: p.name, features: p.features })),
    },
    wash: { levels: washLevels },
    tint: {
      options: tintOptions.map((o) => ({ ...o, features: feat(tint, o.name) })),
    },
    contact: {
      phoneDisplay: contact.phoneDisplay,
      phoneHref: contact.phoneHref,
      whatsapp: contact.whatsapp,
      whatsappHello: whatsappLink('Hi WRP, I have a question about a quote.'),
      hoursShort: contact.hoursShort,
      closed: contact.closed,
      schedule: contact.schedule,
      address: contact.address.join(', '),
    },
    lounge: lounge.amenities.slice(0, 4).map((a) => a.name),
    quotes: {
      updates: {
        text: 'The team kept me updated throughout the process with pictures and videos, and the workmanship is truly amazing. Car was delivered exactly on the promised time.',
        author: 'Leno Thomas',
      },
      ppf: freshQuotes.find((q) => q.author === 'Siddik Akbar') ?? null,
      wrap: freshQuotes.find((q) => q.author === 'A Khalid') ?? null,
      // Verbatim sentence from a Google review (REVIEWS.md); spacing tidied.
      collect: {
        text: 'They have picked up the car from my location and delivered with very much care and timely updates.',
        author: 'vinod kumar',
      },
    },
  };
}
