/**
 * Local content for the Layers concept: a cross-section through a car's paint.
 *
 * Thicknesses are TYPICAL ranges, not product specs. The drawing uses one value
 * inside each range (`drawn`) so the scale is honest and consistent everywhere:
 * the hero stack, the depth gauge and the ceramic zoom all use these numbers.
 * Sources: WRP's own service pages (PPF 7.5–8.5 mil, paint-depth gauge before
 * correction), and common industry ranges for factory clear/base coats.
 */
import { freshQuotes, services, whatsappLink, type Service } from '../data';

export type PaintLayer = {
  id: string;
  /** Name as it reads in a sentence ("in the clear coat"). */
  name: string;
  short: string;
  typical: string;
  /** Microns used for the to-scale drawing. */
  drawn: number;
};

export const paintLayers: PaintLayer[] = [
  { id: 'ceramic', name: 'ceramic coating', short: 'Ceramic', typical: '1–2 µm', drawn: 2 },
  { id: 'film', name: 'paint protection film', short: 'Film', typical: '150–200 µm', drawn: 175 },
  { id: 'clear', name: 'clear coat', short: 'Clear coat', typical: '35–50 µm', drawn: 45 },
  { id: 'colour', name: 'colour coat', short: 'Colour', typical: '12–20 µm', drawn: 16 },
  { id: 'primer', name: 'primer', short: 'Primer', typical: '20–40 µm', drawn: 30 },
];

/** Depth (µm from the surface) where each layer starts and ends, in drawing order. */
export const depths = (() => {
  let at = 0;
  const out: Record<string, { from: number; to: number }> = {};
  for (const l of paintLayers) {
    out[l.id] = { from: at, to: at + l.drawn };
    at += l.drawn;
  }
  out.metal = { from: at, to: at };
  return out;
})();

export const svc = (slug: string): Service => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown service ${slug}`);
  return s;
};

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;

/** First name + initial, the way the brief asks reviews to be attributed. */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  // "A Khalid" is already an initial + surname: keep it as Google shows it.
  if (first.length < 2) return name.trim();
  const last = rest.at(-1);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return last ? `${cap(first)} ${last.charAt(0).toUpperCase()}.` : cap(first);
};

export type Said = { text: string; author: string; when?: string };

/**
 * A verbatim excerpt of a review. Fresh (2026) reviews are checked against
 * data.ts so an excerpt can never drift from the original words.
 */
export const said = (author: string, text: string): Said => {
  const f = freshQuotes.find((x) => x.author === author);
  if (f && !f.text.includes(text.replace(/…$/, ''))) throw new Error(`Quote from ${author} is not verbatim`);
  return { text, author: shortName(author), when: f?.when };
};

export const quotes = {
  ppf: said('Siddik Akbar', 'I got a PPF on my car. The service is amazing. Afzal kept me informed on the progress of the process.'),
  reinstall: said(
    'DhaneshKumar KV',
    'They matched the PPF exactly with the same quality and finish as the existing film on the car, and the result is seamless — it blends in like factory installation…',
  ),
  avery: said('Salim Sali', 'I choose avery dennison ppf for my car The team explained everything clearly and delivered on time.'),
  ceramic: said('James Daniel', 'Nice work done quickly and professionally. Detailing and ceramic coating polish works done efficiently!'),
  polish: said('Fathima Said24', 'They even managed to remove minor scratches that had been bothering me.'),
  wrap: said('A Khalid', 'I went for the Matte black hood + spoiler combo and i must say that the result is outstanding.'),
  tint: said('Abdul Ansaf', 'Got my car window tinting done and The work is super clean, professional and makes my car look amazing.'),
  stitching: said('Abhi Urs', 'The seat stitching quality is flawless and looks factory-finished.'),
  mats: said('DhaneshKumar KV', 'I also got custom floor mats made for my Jetour T2, and the quality, fitting, and finishing were spot on…'),
  interior: said('Muhammad Nadir', 'Got complete interior detailing done along with exterior wash for better paint. Quick turn around time too!'),
  detail: said(
    'Aadithya Dhanesh',
    'The car was super dirty when i dropped it off and they made it look brand new inside and out.',
  ),
  level3: said('Ritha farzana', 'We did level 3 detailed wash & wrp did an amazing job…our car just looked very new after the wash'),
};

/** Wash & detailing levels (AED), sedan / SUV. Real prices from the owner. */
export const washLevels = [
  {
    name: 'Level 1',
    sedan: 100,
    suv: 120,
    adds: 'Hand wash after a pre-rinse and pre-wash, rims and tyres, glass, interior vacuum and wipe-down.',
  },
  {
    name: 'Level 2',
    sedan: 189,
    suv: 199,
    adds: 'Adds a deeper pre-wash, full arches, engine bay cleaning and a ceramic sealant that lasts 2–3 months.',
  },
  {
    name: 'Level 3',
    sedan: 300,
    suv: 325,
    adds: 'Adds tar and iron removal, carpet extraction, engine bay protection and ceramic that lasts about 6 months.',
  },
];

/** PPF coverage, named as on WRP's PPF page. Priced per car, so no per-package prices here. */
export const coverage = [
  { name: 'Front end', covers: 'Bumper, bonnet, front wings, mirrors and headlights: where the stones hit.' },
  { name: 'Track', covers: 'The front end plus sills, rear bumper and wings, door edges, handles and A-pillars.' },
  { name: 'Full body', covers: 'Every painted panel, roof and boot included, door jambs too.' },
];

/** Services the hero form offers, with the words used in the WhatsApp message. */
export const asks = [
  { key: 'ppf', label: 'PPF', words: 'paint protection film' },
  { key: 'ceramic', label: 'Ceramic', words: 'ceramic coating' },
  { key: 'polish', label: 'Polish', words: 'polish / paint correction' },
  { key: 'tint', label: 'Window tint', words: 'window tint' },
  { key: 'detail', label: 'Detailing', words: 'a detail or premium wash' },
  { key: 'interior', label: 'Seats & mats', words: 'upholstery, seat stitching or floor mats' },
  { key: 'wrap', label: 'Wrap', words: 'a partial wrap' },
];

export const hello = whatsappLink('Hi WRP, I’d like a quote for my car.');
export const ask = (what: string) => whatsappLink(`Hi WRP, I’d like a quote for ${what}. My car is a `);

export const navLinks = [
  { label: 'The layers', href: '#layers' },
  { label: 'Glass & interior', href: '#surfaces' },
  { label: 'Work', href: '#work' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Visit', href: '#visit' },
];

/** The hero car. Portrait photo (1179×2091); the car sits at 58–80% of its height. */
export const heroCar = {
  base: '/portfolio/green-porsche-911-showroom-event',
  alt: 'A green Porsche 911 in the WRP studio after ceramic coating and detailing, the ceiling lights reflected along its roof',
  caption: 'Porsche 911, ceramic coating and detail',
  sizes: '(min-width: 64rem) 58vw, 100vw',
};
