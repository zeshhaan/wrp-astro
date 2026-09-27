/**
 * Diagnosis: the symptom -> fix map.
 *
 * Every price comes from `services` in ../data.ts (or the wash levels in
 * src/content/services/premium-car-wash.mdx). Steps paraphrase the process
 * sections of each service's .mdx. Quotes are verbatim Google reviews
 * (REVIEWS.md / freshQuotes), attributed by first name and initial.
 */
import { services, freshQuotes, type Service } from '../data';

const svc = (slug: string): Service => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown service ${slug}`);
  return s;
};

const fresh = (author: string) => {
  const q = freshQuotes.find((x) => x.author === author);
  if (!q) throw new Error(`No fresh quote from ${author}`);
  return q.text;
};

export type Quote = { text: string; author: string; context: string };

/** Car-plan zones. See Plan.astro for the drawing. */
export type Zone =
  | 'bumper-f'
  | 'bonnet'
  | 'wing-l'
  | 'wing-r'
  | 'side-l'
  | 'side-r'
  | 'roof'
  | 'boot'
  | 'bumper-r'
  | 'spoiler'
  | 'mirrors'
  | 'trim'
  | 'screen'
  | 'rear-glass'
  | 'side-glass'
  | 'seats'
  | 'floor'
  | 'wheels'
  | 'under';

const paint: Zone[] = ['bumper-f', 'bonnet', 'wing-l', 'wing-r', 'side-l', 'side-r', 'roof', 'boot', 'bumper-r', 'mirrors'];
const glass: Zone[] = ['screen', 'rear-glass', 'side-glass'];

export type FixId = 'detail-2' | 'detail-3' | 'polish' | 'ppf' | 'wrap' | 'ceramic' | 'tint' | 'upholstery';

export type Symptom = {
  id: string;
  group: 'outside' | 'dirt' | 'inside' | 'new';
  /** What the owner would say. */
  label: string;
  /** One plain line of recognition, in the owner's terms. */
  hint: string;
  /** Short form for the job card and the WhatsApp message. */
  short: string;
  /** A defect is marked orange; a wish (new look, keep it new) is marked blue. */
  kind: 'defect' | 'wish';
  zones: Zone[];
  /** Callout label position and the point its leader line touches, in plan coordinates. */
  callout: { x: number; y: number; tx: number; ty: number };
  /** First fix is the primary one: its quote is this symptom's quote. */
  fixes: FixId[];
  quote: Quote;
};

export const groups = [
  { id: 'outside', legend: 'Paint and body' },
  { id: 'dirt', legend: 'Dirt' },
  { id: 'inside', legend: 'Inside the car' },
  { id: 'new', legend: 'Nothing wrong yet' },
] as const;

export const symptoms: Symptom[] = [
  {
    id: 'chips',
    group: 'outside',
    label: 'Stone chips on the bonnet and front bumper',
    hint: 'Little white dots across the front, from highway grit.',
    short: 'Stone chips on the front',
    kind: 'defect',
    zones: ['bumper-f', 'bonnet', 'wing-l', 'wing-r', 'mirrors'],
    callout: { x: 618, y: 150, tx: 580, ty: 150 },
    fixes: ['ppf'],
    quote: { text: fresh('Siddik Akbar'), author: 'Siddik A.', context: 'PPF, September 2026' },
  },
  {
    id: 'swirls',
    group: 'outside',
    label: 'Swirl marks, light scratches, dull paint',
    hint: 'Spider-web circles in the sun, a finish that looks flat.',
    short: 'Swirls and dull paint',
    kind: 'defect',
    zones: paint,
    callout: { x: 300, y: 18, tx: 300, ty: 62 },
    fixes: ['polish'],
    quote: {
      text: 'They even managed to remove minor scratches that had been bothering me.',
      author: 'Fathima S.',
      context: 'detailing and polish on a BMW',
    },
  },
  {
    id: 'faded',
    group: 'outside',
    label: 'Faded or oxidised paint',
    hint: 'The roof and bonnet have gone chalky or patchy in the sun.',
    short: 'Faded, oxidised paint',
    kind: 'defect',
    zones: ['bonnet', 'roof', 'boot'],
    callout: { x: 22, y: 150, tx: 130, ty: 150 },
    fixes: ['polish', 'ceramic'],
    quote: {
      text: 'WRP made my 5-year-old car look brand new again. The outside paint is flawless, and the interior looks and smells factory fresh.',
      author: 'Chad G.',
      context: 'detailing',
    },
  },
  {
    id: 'look',
    group: 'outside',
    label: 'I want a new look',
    hint: 'A matte black bonnet, a black roof, chrome delete.',
    short: 'A new look (wrap or chrome delete)',
    kind: 'wish',
    zones: ['bonnet', 'spoiler', 'trim', 'mirrors'],
    callout: { x: 150, y: 18, tx: 100, ty: 110 },
    fixes: ['wrap'],
    quote: { text: fresh('A Khalid'), author: 'A. Khalid', context: 'matte black bonnet and spoiler, August 2026' },
  },
  {
    id: 'filthy',
    group: 'dirt',
    label: 'It’s just filthy, inside and out',
    hint: 'Dust in every vent, crumbs in the seats, a grey film on the paint.',
    short: 'Filthy inside and out',
    kind: 'defect',
    zones: [...paint, 'seats', 'floor', 'wheels'],
    callout: { x: 460, y: 282, tx: 480, ty: 200 },
    fixes: ['detail-2'],
    quote: { text: fresh('Aadithya Dhanesh'), author: 'Aadithya D.', context: 'detailing, September 2026' },
  },
  {
    id: 'sand',
    group: 'dirt',
    label: 'Sand and desert grime',
    hint: 'Weekends in the dunes, sand packed into the arches and underneath.',
    short: 'Sand and off-road grime',
    kind: 'defect',
    zones: ['wheels', 'under', 'bumper-f', 'bumper-r'],
    callout: { x: 590, y: 282, tx: 520, ty: 256 },
    fixes: ['ceramic', 'detail-3'],
    quote: {
      text: 'I use the car for desert off-roading, and it now looks like brand-new showroom condition.',
      author: 'Leno T.',
      context: 'ceramic coating on an FJ Cruiser',
    },
  },
  {
    id: 'stains',
    group: 'inside',
    label: 'Coffee stains, marked seats and carpets',
    hint: 'Spills you have stopped seeing, and a smell you haven’t.',
    short: 'Stains on seats and carpets',
    kind: 'defect',
    zones: ['seats', 'floor'],
    callout: { x: 270, y: 282, tx: 276, ty: 190 },
    fixes: ['detail-3'],
    quote: {
      text: 'My car was in pretty dirty, with coffee stains that I thought would never come out. I was absolutely blown away by the results!',
      author: 'Azhar P.',
      context: 'full interior detailing on an Altima',
    },
  },
  {
    id: 'seats',
    group: 'inside',
    label: 'Tired seats, worn stitching, old mats',
    hint: 'Cracked bolsters, split seams, mats that no longer fit.',
    short: 'Worn seats, stitching or mats',
    kind: 'defect',
    zones: ['seats'],
    callout: { x: 400, y: 18, tx: 352, ty: 122 },
    fixes: ['upholstery'],
    quote: {
      text: 'The seat stitching quality is flawless and looks factory-finished.',
      author: 'Abhi U.',
      context: 'seat stitching and full detail',
    },
  },
  {
    id: 'heat',
    group: 'inside',
    label: 'The cabin is too hot, the sun too bright',
    hint: 'Scorching seats at noon, squinting through the glare.',
    short: 'Hot cabin and sun glare',
    kind: 'defect',
    zones: glass,
    callout: { x: 520, y: 18, tx: 412, ty: 110 },
    fixes: ['tint'],
    quote: {
      text: 'Got my car window tinting done and The work is super clean, professional and makes my car look amazing.',
      author: 'Abdul A.',
      context: 'window film',
    },
  },
  {
    id: 'new',
    group: 'new',
    label: 'It’s new and I want to keep it that way',
    hint: 'Just collected it. Protect the paint before the first chip.',
    short: 'New car, keep it perfect',
    kind: 'wish',
    zones: [...paint, ...glass],
    callout: { x: 140, y: 282, tx: 170, ty: 238 },
    fixes: ['ppf', 'ceramic', 'tint'],
    quote: {
      text: 'I choose avery dennison ppf for my car The team explained everything clearly and delivered on time. My car looks brand new and so easy to maintain now.',
      author: 'Salim S.',
      context: 'PPF and window tint',
    },
  },
];

export type Fix = {
  id: FixId;
  name: string;
  href: string;
  /** Starting price in AED, or null. Detail levels carry saloon/SUV prices. */
  from: number | null;
  fromSuv?: number;
  time: string;
  /** Rough minutes, used only to find the longest single job. */
  minutes: number;
  facts: string[];
  steps: [string, string, string];
  image?: { base: string; alt: string; width?: number; height?: number };
  /** Used when no ticked symptom has this fix as its primary. */
  quote: Quote;
};

const ppf = svc('paint-protection-film');
const ceramic = svc('ceramic-coating');
const tint = svc('window-film');
const polish = svc('polish');
const wash = svc('premium-car-wash');
const leather = svc('leather-upholstery');

/** In the order the work is done on the car. */
export const fixes: Fix[] = [
  {
    id: 'detail-2',
    name: 'Level 2 detail',
    href: wash.href,
    from: 189,
    fromSuv: 199,
    time: wash.time,
    minutes: wash.minutes,
    facts: ['Hand wash only', 'Engine bay cleaned', 'Sealant lasts 2 to 3 months'],
    steps: [
      'Vacuum, wipe-down and protection inside.',
      'Alkaline pre-wash, then a hand contact wash; rims, tyres and arches cleaned in full.',
      'Engine bay cleaned, ceramic sealant on the paint.',
    ],
    image: { base: '/portfolio/team-washing-subaru-sti-foam', alt: 'WRP detailer foaming a blue Subaru WRX STI by hand' },
    quote: { text: fresh('Huzaifa Hamid'), author: 'Huzaifa H.', context: 'deep clean, July 2026' },
  },
  {
    id: 'detail-3',
    name: 'Level 3 detail',
    href: wash.href,
    from: 300,
    fromSuv: 325,
    time: wash.time,
    minutes: wash.minutes,
    facts: ['Tar and iron removed', 'Carpet extraction', 'Sealant lasts about 6 months'],
    steps: [
      'Everything in Level 2, including the engine bay.',
      'Acidic wash, then a neutralising wash; tar and iron lifted off the paint.',
      'Carpets extraction-cleaned, advanced ceramic sealant on the paint.',
    ],
    image: { base: '/review-images/ritha_farzana_2', alt: 'Engine bay of a Nissan after a Level 3 detail at WRP. Photo by customer Ritha Farzana' },
    quote: {
      text: 'We did level 3 detailed wash & wrp did an amazing job…our car just looked very new after the wash',
      author: 'Ritha F.',
      context: 'Level 3 detail',
    },
  },
  {
    id: 'polish',
    name: polish.name,
    href: polish.href,
    from: polish.from,
    time: polish.time,
    minutes: polish.minutes,
    facts: [...polish.facts],
    steps: [
      'Paint depth measured with a gauge, defects mapped under inspection lights.',
      'Wash, decontamination and clay, so nothing is ground into the paint.',
      'Machine polished in stages, then checked under different lights.',
    ],
    image: { base: polish.image, alt: polish.imageAlt },
    quote: {
      text: 'I got my car washed and polished today, and I’m extremely happy with the results.',
      author: 'Sabith K.',
      context: 'wash and polish',
    },
  },
  {
    id: 'ppf',
    name: ppf.name,
    href: ppf.href,
    from: ppf.from,
    time: ppf.time,
    minutes: ppf.minutes,
    facts: [...ppf.facts],
    steps: [
      'Paint inspected and prepared; corrected first if it needs it.',
      'Film cut to your model’s pattern and fitted panel by panel in the studio.',
      'Final inspection. Any light haze settles out in the first 24 to 72 hours.',
    ],
    image: { base: ppf.image, alt: ppf.imageAlt },
    quote: {
      text: 'They matched the PPF exactly with the same quality and finish as the existing film on the car, and the result is seamless',
      author: 'DhaneshKumar K.',
      context: 'PPF re-install',
    },
  },
  {
    id: 'wrap',
    name: 'Wrap & styling',
    href: '/contact-us/',
    from: null,
    time: 'Set at inspection',
    minutes: 0,
    facts: ['Partial or full wraps', 'Matte black bonnet, roof, spoiler', 'Chrome delete'],
    steps: [
      'Agree the panels and the finish with you, with samples in hand.',
      'Panels cleaned and prepped so the film sits flat on every edge.',
      'Wrapped by hand, edges checked before the car goes back to you.',
    ],
    quote: { text: fresh('A Khalid'), author: 'A. Khalid', context: 'matte black bonnet and spoiler' },
  },
  {
    id: 'ceramic',
    name: ceramic.name,
    href: ceramic.href,
    from: ceramic.from,
    time: ceramic.time,
    minutes: ceramic.minutes,
    facts: [...ceramic.facts],
    steps: [
      'Deep clean and decontamination.',
      'Paint corrected and prepped so the coating bonds to clean clear coat.',
      'Adam’s ceramic applied, cured and inspected.',
    ],
    image: { base: '/review-images/leno_thomas_1', alt: 'Grey Toyota FJ Cruiser after ceramic coating at WRP. Photo by customer Leno Thomas' },
    quote: { text: fresh('James Daniel'), author: 'James D.', context: 'detailing and ceramic on a Tesla Model 3' },
  },
  {
    id: 'tint',
    name: tint.name,
    href: tint.href,
    from: tint.from,
    time: tint.time,
    minutes: tint.minutes,
    facts: [...tint.facts],
    steps: [
      'Glass cleaned inside and out.',
      'Nano-ceramic film cut precisely to each window.',
      'Film applied, edges and clarity checked.',
    ],
    image: { base: tint.image, alt: tint.imageAlt },
    quote: {
      text: 'Excellent service, got window tint and ceramic coating clean work and very professional',
      author: 'Ansif K.',
      context: 'window tint and ceramic',
    },
  },
  {
    id: 'upholstery',
    name: leather.name,
    href: leather.href,
    from: leather.from,
    time: leather.time,
    minutes: leather.minutes,
    facts: [...leather.facts],
    steps: [
      'Choose leather, colour and stitching from the samples in our materials room.',
      'Seats and mats measured for your exact model.',
      'Made, fitted and the stitching checked before handover.',
    ],
    image: { base: leather.image, alt: leather.imageAlt },
    quote: {
      text: 'I also got custom floor mats made for my Jetour T2, and the quality, fitting, and finishing were spot on',
      author: 'DhaneshKumar K.',
      context: 'custom floor mats',
    },
  },
];

/**
 * Honest notes that appear when two jobs meet. `requires` is a list of groups;
 * the note shows when every group has at least one of its fixes on the card.
 */
export const notes: { id: string; requires: FixId[][]; text: string }[] = [
  {
    id: 'correct-first',
    requires: [['polish'], ['ppf', 'ceramic', 'wrap']],
    text: 'Correct first, then protect. We polish out the swirls before any film or coating goes on, so they are not sealed in underneath.',
  },
  {
    id: 'wash-included',
    requires: [['ceramic'], ['detail-2', 'detail-3']],
    text: 'Ceramic coating starts with a deep clean and decontamination of the paint anyway. Keep the detail if the inside needs it; if it doesn’t, we will tell you to skip it.',
  },
];

/** What the page promises, each backed by a verbatim review. */
export const commitments = [
  {
    claim: 'Photo and video updates while we work',
    detail: 'You see the car on WhatsApp as the work goes, not only at the end.',
    quote: { text: 'The team kept me updated throughout the process with pictures and videos', author: 'Leno T.' },
  },
  {
    claim: 'Handed back when we said',
    detail: 'We give you a time when the car comes in, and we keep to it.',
    quote: { text: 'Car was delivered exactly on the promised time.', author: 'Leno T.' },
  },
  {
    claim: 'Advice, not a sales pitch',
    detail: 'We tell you what the car needs, and what it doesn’t.',
    quote: { text: 'They kept me updated, delivered on time, and didn’t try to push any unnecessary extras.', author: 'Ameena S.' },
  },
  {
    claim: 'Pickup and delivery',
    detail: 'Ask when you book, and we can collect the car and bring it back.',
    quote: { text: 'They have picked up the car from my location and delivered with very much care and timely updates', author: 'Vinod K.' },
  },
  {
    claim: 'Checked before you get the keys',
    detail: 'The work is checked again before the car goes back to you.',
    quote: { text: 'They double-checked everything before handing it over and made sure I was happy with the results.', author: 'Venkat K.' },
  },
];

/** The wrap service, which has no page in `services`. */
export const wrapService = {
  name: 'Wrap & styling',
  href: '/contact-us/',
  line: 'Partial wraps like a matte black bonnet and spoiler, black roofs and chrome delete.',
  time: 'Set at inspection',
};

/** Wash levels, from premium-car-wash.mdx. */
export const washLevels = [
  { name: 'Level 1', what: 'Keeps a clean car clean', saloon: 100, suv: 120 },
  { name: 'Level 2', what: 'Properly clean inside and out, engine bay included', saloon: 189, suv: 199 },
  { name: 'Level 3', what: 'Decontamination, tar and iron, carpet extraction', saloon: 300, suv: 325 },
];

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;
