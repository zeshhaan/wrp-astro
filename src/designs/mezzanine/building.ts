/** Local content and geometry for the Mezzanine concept (round 2: the studio floor first). */
import { freshQuotes, services, whatsappLink, type Service } from '../data';

/**
 * The hero is cut along the glass line. Above it, the result: a finished Lexus LX in
 * the studio. Below it, the craft: the team working on a Lexus in the same bay.
 * Both photos are portrait (1200×1269 and 1200×1680); the hero crops them wide.
 */
export const heroResult = {
  base: '/portfolio/black-lexus-lx-570-showroom',
  alt: 'A black Lexus LX 570 in the WRP studio after a full detail, the paint reflecting the ceiling lights',
  position: '50% 96%',
};
export const heroCraft = {
  base: '/portfolio/team-detailing-black-lexus-hood',
  alt: 'Two WRP detailers working on a black Lexus, one under the open bonnet, one at the front wheel',
  position: '50% 78%',
};

export const floors = [
  { code: '1', id: 'first-floor', name: 'Lounge', full: 'First floor' },
  { code: 'G', id: 'ground-floor', name: 'Studio', full: 'Ground floor' },
  { code: 'S', id: 'street', name: 'Street', full: 'Street' },
] as const;

/** Header links, in the order you meet them on the page. */
export const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#work' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Lounge', href: '#lounge' },
  { label: 'Visit', href: '#visit' },
];

export const whatsappHello = whatsappLink('Hi WRP, I’d like a quote for my car.');

/** First name + initial, the way the brief asks reviews to be attributed. */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return last ? `${cap(first)} ${last.charAt(0).toUpperCase()}.` : cap(first);
};

const fresh = (author: string) => {
  const q = freshQuotes.find((f) => f.author === author);
  if (!q) throw new Error(`No fresh quote from ${author}`);
  return q;
};

export type BayQuote = { text: string; author: string; when?: string };

/**
 * The bays, in the owner's order of emphasis. Detailing and the premium wash share
 * a service page and a price list, so they share a bay. Quotes are verbatim excerpts
 * of Google reviews that praise that exact service: the newest (2026) where one exists,
 * the February set otherwise.
 */
export type Bay = {
  key: string;
  service: Service;
  name: string;
  line: string;
  quote: BayQuote;
  /** How the service is named in the prefilled WhatsApp message. */
  ask: string;
};

const svc = (slug: string) => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown service ${slug}`);
  return s;
};

const q = (author: string, text: string): BayQuote => {
  const f = freshQuotes.find((x) => x.author === author);
  if (f && !f.text.includes(text.replace(/…$/, ''))) throw new Error(`Quote from ${author} is not verbatim`);
  return { text, author: shortName(author), when: f?.when };
};

export const bays: Bay[] = [
  {
    key: 'ppf',
    service: svc('paint-protection-film'),
    name: 'Paint protection film',
    line: 'Clear, self-healing film that takes the stone chips so your paint doesn’t. Full panels re-fitted to match film already on the car.',
    quote: q('Siddik Akbar', 'Afzal kept me informed on the progress of the process.'),
    ask: 'paint protection film (PPF)',
  },
  {
    key: 'detailing',
    service: svc('premium-car-wash'),
    name: 'Detailing & premium wash',
    line: 'Three levels, from a pH-neutral hand wash to the Level 3 detail, inside and out.',
    quote: q('Muhammad Nadir', 'Got complete interior detailing done along with exterior wash for better paint. Quick turn around time too!'),
    ask: 'a detail / premium wash',
  },
  {
    key: 'polish',
    service: svc('polish'),
    name: 'Polish & paint correction',
    line: svc('polish').line,
    quote: { text: 'The shine after the polish was unreal…', author: 'Ameena S.' },
    ask: 'polish and paint correction',
  },
  {
    key: 'ceramic',
    service: svc('ceramic-coating'),
    name: 'Ceramic coating',
    line: svc('ceramic-coating').line,
    quote: q('James Daniel', 'Detailing and ceramic coating polish works done efficiently!'),
    ask: 'ceramic coating',
  },
  {
    key: 'upholstery',
    service: svc('leather-upholstery'),
    name: 'Upholstery & mats',
    line: 'Seat stitching, custom seat covers and made-to-measure floor mats, chosen from real samples.',
    quote: { text: 'The seat stitching quality is flawless and looks factory-finished.', author: 'Abhi U.' },
    ask: 'upholstery / seat covers / floor mats',
  },
  {
    key: 'tint',
    service: svc('window-film'),
    name: 'Window tint',
    line: svc('window-film').line,
    quote: { text: 'Got my car window tinting done and The work is super clean, professional and makes my car look amazing.', author: 'Abdul A.' },
    ask: 'window tint',
  },
];

/** Wash levels (AED), sedan / SUV. Real prices from the owner. */
export const washLevels = [
  { name: 'Level 1', sedan: 100, suv: 120 },
  { name: 'Level 2', sedan: 189, suv: 199 },
  { name: 'Level 3', sedan: 300, suv: 325 },
];

/** Wrap & styling is the W in WRP but has no service page: a smaller bay, priced after inspection. */
export const wrapBay = {
  key: 'wrap',
  name: 'Wrap & styling',
  line: 'Partial wraps and details: a matte-black bonnet and spoiler, a chrome delete, a roof.',
  quote: q('A Khalid', 'I went for the Matte black hood + spoiler combo and i must say that the result is outstanding.'),
  href: '/contact-us/',
  ask: 'a partial wrap / styling',
};

/** The quote shown on the glass above the hero headline. */
export const heroQuote = (() => {
  const f = fresh('Aadithya Dhanesh');
  return {
    text: 'The car was super dirty when i dropped it off and they made it look brand new inside and out.',
    author: shortName(f.author),
    when: f.when,
  };
})();

/**
 * How a job runs, gate to handover. Each step is something customers describe in
 * their reviews, with their words next to it.
 */
export const route = [
  {
    title: 'Straight advice',
    body: 'We look at the car with you, explain what it needs and what it doesn’t, and confirm the price before we start.',
    quote: 'They explained every step of the process clearly and offered helpful suggestions without any pressure.',
    author: 'Sujith P.',
  },
  {
    title: 'Pickup if you need it',
    body: 'Can’t bring the car in? Ask about collection and return when you book.',
    quote: 'They have picked up the car from my location and delivered with very much care and timely updates.',
    author: 'Vinod K.',
  },
  {
    title: 'Photos and videos as we work',
    body: 'We send progress photos and videos while we work, so you can follow the job from wherever you are.',
    quote: 'The team kept me updated throughout the process with pictures and videos…',
    author: 'Leno T.',
  },
  {
    title: 'A final check',
    body: 'Before you get the keys, we check the work again and make sure you’re happy with it.',
    quote: 'They double-checked everything before handing it over and made sure I was happy with the results.',
    author: 'Venkat K.',
  },
  {
    title: 'Ready when we said',
    body: 'You get a time when you drop the car off, and we plan the job around it.',
    quote: 'Car was delivered exactly on the promised time.',
    author: 'Leno T.',
  },
];
