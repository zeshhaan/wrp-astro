/**
 * Local content for "The Menu" concept, round 2: services first.
 * Prices and times come from src/designs/data.ts (and premium-car-wash.mdx for the
 * wash levels). Quotes are verbatim Google reviews: `freshQuotes` from data.ts where
 * one matches the service, otherwise an earlier review quoted word for word in REVIEWS.md.
 */
import { services, freshQuotes, type Service } from '../data';

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;

const bySlug = (slug: string): Service => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown service ${slug}`);
  return s;
};

/** "Siddik Akbar" → "Siddik A."; names already shortened ("A Khalid") stay as displayed. */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  if (!rest.length || first.length <= 2) return name;
  return `${first} ${rest[rest.length - 1][0].toUpperCase()}.`;
};

export type Note = { text: string; author: string; when?: string };

const fresh = (author: string): Note => {
  const q = freshQuotes.find((x) => x.author === author);
  if (!q) throw new Error(`No fresh quote from ${author}`);
  return { text: q.text, author: shortName(q.author), when: q.when };
};

export type Dish = {
  slug: string;
  name: string;
  /** Shorter name for the hero carte and the WhatsApp message. */
  short: string;
  href: string;
  hrefLabel: string;
  line: string;
  /** Starting price for a sedan (and SUV where it differs), or null when priced after inspection. */
  sedan: number | null;
  suv: number | null;
  /** Human time, and hours/days bounds for the planner. unit null = timed after inspection. */
  time: string;
  lo: number;
  hi: number;
  unit: 'hours' | 'days' | null;
  facts: string[];
  note: Note;
  /** A smaller line on the menu (wrap & styling). */
  side?: boolean;
  /** The wash carries a level choice in the planner. */
  levels?: boolean;
};

const fromService = (slug: string, note: Note, extra: Partial<Dish> = {}): Dish => {
  const s = bySlug(slug);
  const m = s.time.match(/(\d+)\s*[–-]\s*(\d+)\s*(hour|day)/i);
  return {
    slug: s.slug,
    name: s.name,
    short: s.name,
    href: s.href,
    hrefLabel: `More about ${s.short === 'Interior' ? 'upholstery' : s.name.toLowerCase()}`,
    line: s.line,
    sedan: s.from,
    suv: s.from,
    time: m ? `${m[1]} to ${m[2]} ${m[3].toLowerCase()}s` : s.time,
    lo: m ? Number(m[1]) : 1,
    hi: m ? Number(m[2]) : 1,
    unit: m ? (m[3].toLowerCase() === 'day' ? 'days' : 'hours') : null,
    facts: [...s.facts],
    note,
    ...extra,
  };
};

/** Wash levels as published in premium-car-wash.mdx (fallback if the entry can't be read). */
export const washLevelFallback = [
  { name: 'Level 1', sedan: 100, suv: 120 },
  { name: 'Level 2', sedan: 189, suv: 199 },
  { name: 'Level 3', sedan: 300, suv: 325 },
];

export const washLevelNotes: Record<string, string> = {
  'Level 1': 'Hand wash, interior vacuum and wipe-down, rims and glass.',
  'Level 2': 'Adds engine bay cleaning, arches and a ceramic sealant for 2 to 3 months.',
};

/** The menu, in the owner's order of emphasis. */
export const dishes: Dish[] = [
  fromService('paint-protection-film', fresh('Siddik Akbar'), {
    name: 'Paint protection film',
    short: 'Paint protection film',
    hrefLabel: 'More about PPF',
    facts: ['Avery Dennison and STEK films', 'Self-healing top coat', 'Up to 10-year warranty', 'Panels re-fitted to match existing film'],
  }),
  {
    slug: 'detailing',
    name: 'Detailing, inside and out',
    short: 'Detailing',
    href: '/services/premium-car-wash/',
    hrefLabel: 'See what Level 3 includes',
    line: 'Starts with our Level 3 detail: tar and iron removal, carpet extraction, engine bay and six-month ceramic. Stains and deeper interior work are quoted when we see the car.',
    sedan: washLevelFallback[2].sedan,
    suv: washLevelFallback[2].suv,
    time: 'most of a day',
    lo: 4,
    hi: 8,
    unit: 'hours',
    facts: ['Interior and exterior', 'Engine bay cleaned and protected', `SUV from ${aed(washLevelFallback[2].suv)}`],
    note: fresh('Muhammad Nadir'),
  },
  fromService('polish', {
    text: 'The shine after the polish was unreal, and the interior looked cleaner than the day I bought it.',
    author: 'Ameena S.',
  }, { name: 'Polish and paint correction', short: 'Paint correction' }),
  fromService('ceramic-coating', fresh('James Daniel'), { name: 'Ceramic coating', short: 'Ceramic coating' }),
  fromService(
    'leather-upholstery',
    { text: 'The seat stitching quality is flawless and looks factory-finished.', author: 'Abhi U.' },
    { name: 'Upholstery, seats and mats', short: 'Upholstery', line: 'Seat stitching, custom seat covers and made-to-measure floor mats, chosen from real samples.' },
  ),
  fromService('window-film', {
    text: 'Got my car window tinting done and The work is super clean, professional and makes my car look amazing.',
    author: 'Abdul A.',
  }, { name: 'Window tint', short: 'Window tint' }),
  fromService('premium-car-wash', fresh('Sunit Gonsalves'), {
    name: 'Premium hand wash',
    short: 'Hand wash',
    line: 'A careful hand wash with pH-neutral products and a filtered, spot-free rinse. Level 2 adds the engine bay and a ceramic sealant.',
    suv: washLevelFallback[0].suv,
    facts: ['Hand wash only', 'Filtered, spot-free rinse', `SUV from ${aed(washLevelFallback[0].suv)}`],
    levels: true,
  }),
  {
    slug: 'wrap',
    name: 'Wrap and styling',
    short: 'Wrap and styling',
    href: '/contact-us/',
    hrefLabel: 'Ask about a wrap',
    line: 'Partial wraps and trim: a matte black bonnet and spoiler, or a chrome delete.',
    sedan: null,
    suv: null,
    time: 'timed when we see the car',
    lo: 0,
    hi: 0,
    unit: null,
    facts: [],
    note: fresh('A Khalid'),
    side: true,
  },
];

/** The hero headline is a customer's words; this is who said them. */
export const heroQuote = fresh('Aadithya Dhanesh');

/** Operational promises, each backed by what reviewers wrote (verbatim fragments). */
export const promises = [
  { title: 'Photos and videos as we work', proof: '“updated throughout the process with pictures and videos”', who: 'Leno T.' },
  { title: 'Back when we said', proof: '“delivered exactly on the promised time”', who: 'Leno T.' },
  { title: 'Checked before you collect', proof: '“double-checked everything before handing it over”', who: 'Venkat K.' },
  { title: 'We can collect the car', proof: '“picked up the car from my location and delivered”', who: 'Vinod K.' },
];
