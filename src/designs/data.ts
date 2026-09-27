/**
 * Shared content for the Design Lab concepts.
 *
 * Every concept renders the same facts so the team compares layouts, not copy.
 * Prices come from the `startingPrice` fields in src/content/services/*.mdx and
 * the lounge details from verified Google reviews (data/google-reviews.json).
 * Where a service has no published starting price we say so rather than invent one.
 */
import { getAllReviews, getBusiness, type Review } from '@/lib/reviews';

export const contact = {
  phoneDisplay: '+971 54 717 3000',
  phoneHref: 'tel:+971547173000',
  whatsapp: 'https://wa.me/971547173000',
  email: 'info@wrpdetailing.ae',
  instagram: 'https://www.instagram.com/wrp_ae/',
  instagramHandle: '@wrp_ae',
  address: ['Al Qusais Industrial Area 1', 'Dubai, United Arab Emirates'],
  mapsUrl: (getBusiness() as { googleMapsUrl?: string }).googleMapsUrl ?? 'https://maps.google.com/?q=WRP+Detailing+Solutions+Dubai',
  hours: 'Saturday to Thursday, 9:00 AM to 9:30 PM',
  hoursShort: 'Sat–Thu 9 AM–9:30 PM',
  closed: 'Closed Friday',
  /** Opening hours in Dubai local time (UTC+4, no DST). 5 = Friday. */
  schedule: { open: '09:00', close: '21:30', closedDays: [5] as number[], timeZone: 'Asia/Dubai' },
};

/** Build a WhatsApp deep link with a prefilled message. */
export function whatsappLink(message: string): string {
  return `${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export type Service = {
  slug: string;
  href: string;
  name: string;
  short: string;
  /** One-sentence plain description of what the service does. */
  line: string;
  /** Starting price in AED, or null when priced after inspection. */
  from: number | null;
  /** Typical time the car is with us, for planning a lounge visit. */
  time: string;
  /** Rough minutes, used by interactive "plan your visit" widgets. */
  minutes: number;
  /** Three concrete facts, each short enough for a spec line. */
  facts: [string, string, string];
  image: string;
  imageAlt: string;
  pillar: 'Wrap' | 'Reinforce' | 'Protect';
};

export const services: Service[] = [
  {
    slug: 'paint-protection-film',
    href: '/services/paint-protection-film/',
    name: 'Paint Protection Film',
    short: 'PPF',
    line: 'A clear, self-healing film that takes the stone chips and scratches so your paint doesn’t.',
    from: 5999,
    time: '2–4 days',
    minutes: 2 * 24 * 60,
    facts: ['Self-healing top coat', 'Avery Dennison & STEK films', 'Up to 10-year warranty'],
    image: '/portfolio/porsche-boxster-spyder-gray',
    imageAlt: 'Grey Porsche Boxster Spyder after full paint protection film at WRP',
    pillar: 'Wrap',
  },
  {
    slug: 'ceramic-coating',
    href: '/services/ceramic-coating/',
    name: 'Ceramic Coating',
    short: 'Ceramic',
    line: 'A hard, hydrophobic glass layer that keeps the gloss and makes every wash easier.',
    from: 999,
    time: '1–2 days',
    minutes: 24 * 60,
    facts: ['9H hardness', 'Water beads and rolls off', '2–7 year warranty'],
    image: '/portfolio/green-porsche-911-showroom-event',
    imageAlt: 'Green Porsche 911 with fresh ceramic coating at a WRP showroom event',
    pillar: 'Reinforce',
  },
  {
    slug: 'window-film',
    href: '/services/window-film/',
    name: 'Window Film',
    short: 'Tint',
    line: 'Nano-ceramic tint that blocks the Dubai sun without blocking your phone signal.',
    from: 599,
    time: '3–5 hours',
    minutes: 4 * 60,
    facts: ['99% UV blocked', 'Up to 80% heat rejected', 'Signal safe'],
    image: '/luxury-sedan-close-up-black-and-white-elegant',
    imageAlt: 'Close-up of a luxury sedan with ceramic window film',
    pillar: 'Protect',
  },
  {
    slug: 'polish',
    href: '/services/polish/',
    name: 'Polish & Paint Correction',
    short: 'Polish',
    line: 'Machine correction that removes swirls and haze, measured with a paint-depth gauge.',
    from: null,
    time: '1–2 days',
    minutes: 10 * 60,
    facts: ['85–95% of swirls removed', 'Paint depth measured first', 'Single to multi-stage'],
    image: '/portfolio/burgundy-lotus-showroom-display',
    imageAlt: 'Burgundy Lotus Exige after paint correction and ceramic coating',
    pillar: 'Reinforce',
  },
  {
    slug: 'premium-car-wash',
    href: '/services/premium-car-wash/',
    name: 'Premium Car Wash',
    short: 'Wash',
    line: 'A hand wash with pH-neutral products, filtered rinse water and a wax finish.',
    from: 100,
    time: '1–3 hours',
    minutes: 2 * 60,
    facts: ['Hand wash only', 'Filtered, spot-free rinse', 'Three levels, from AED 100'],
    image: '/portfolio/blue-subaru-wrx-sti-showroom',
    imageAlt: 'Blue Subaru WRX STI after a premium hand wash at WRP',
    pillar: 'Protect',
  },
  {
    slug: 'leather-upholstery',
    href: '/services/leather-upholstery/',
    name: 'Leather & Upholstery',
    short: 'Interior',
    line: 'Custom seat covers, stitched upholstery and fitted floor mats, chosen from samples upstairs.',
    from: null,
    time: '1–3 days',
    minutes: 24 * 60,
    facts: ['Genuine & synthetic leather', 'Made-to-measure mats', 'Factory-grade stitching'],
    image: '/leather-service-hero',
    imageAlt: 'Hand-stitched leather car seat upholstery',
    pillar: 'Wrap',
  },
];

export const pillars = [
  { name: 'Wrap', line: 'Film and fabric, fitted to the millimetre.' },
  { name: 'Reinforce', line: 'Correction and coatings that harden the finish.' },
  { name: 'Protect', line: 'Care that keeps it that way, wash after wash.' },
] as const;

/** Responsive image helper for the pre-optimised /public variants. */
export function srcset(base: string, widths: number[] = [480, 800, 1200], ext: 'avif' | 'webp' = 'webp') {
  return widths.map((w) => `${base}-${w}w.${ext} ${w}w`).join(', ');
}

export const work = [
  { title: 'Porsche Boxster Spyder', what: 'Full paint protection', image: '/portfolio/porsche-boxster-spyder-gray' },
  { title: 'Porsche 911', what: 'Ceramic coating & detailing', image: '/portfolio/green-porsche-911-showroom-event' },
  { title: 'Lotus Exige', what: 'Paint correction & ceramic', image: '/portfolio/burgundy-lotus-showroom-display' },
  { title: 'Subaru WRX STI', what: 'Wash & paint protection', image: '/portfolio/blue-subaru-wrx-sti-showroom' },
  { title: 'Lexus LX 570', what: 'Full detailing package', image: '/portfolio/black-lexus-lx-570-showroom' },
  { title: 'Toyota Supra & Lotus', what: 'Showroom detailing', image: '/portfolio/lotus-toyota-supra-showroom-duo' },
];

/** Portfolio car paint colours, sampled from the photos, for concepts that want them. */
export const paintColours = {
  porscheGreen: '#2f5d3a',
  lotusBurgundy: '#5e1622',
  subaruBlue: '#1d3f8a',
  boxsterGrey: '#8a8d90',
  lexusBlack: '#0a0a0a',
};

/**
 * The WRP Lounge. Replaces the old "Signature Fleet" logo wall.
 * Everything here is either visible in customer photos or said in reviews;
 * board games were confirmed by the owner.
 */
export const lounge = {
  name: 'The WRP Lounge',
  where: 'First floor, above the studio',
  pitch:
    'Stay while we work. The lounge sits on the mezzanine above the bays, behind a glass wall, so you can watch your car or ignore it completely.',
  amenities: [
    { name: 'Billiards', detail: 'A full-size table on the first floor.' },
    { name: 'Board games', detail: 'A shelf of them, for a quick round or a long one.' },
    { name: 'Coffee & karak', detail: 'Made fresh while you wait.' },
    { name: 'Big-screen TV', detail: 'Match on, sofa ready.' },
    { name: 'Air-conditioned', detail: 'Cool all year, even in August.' },
    { name: 'Materials room', detail: 'Touch the leather, film and mat samples before you choose.' },
    { name: 'Studio view', detail: 'A glass wall overlooks the bays below.' },
  ],
  photos: [
    {
      base: '/review-images/venkat_k_4',
      alt: 'WRP lounge with a billiards table, big-screen TV and blue sofa',
      caption: 'Billiards, a big screen and a sofa. Photo by customer Venkat K.',
    },
    {
      base: '/review-images/tariq_murad_2',
      alt: 'Glass-walled mezzanine lounge above the WRP studio bays',
      caption: 'The mezzanine lounge, looking down on the bays. Photo by customer Tariq Murad.',
    },
    {
      base: '/review-images/venkat_k_3',
      alt: 'WRP materials room with film rolls, leather seat and floor mat samples',
      caption: 'The materials room: films, leathers and mats. Photo by customer Venkat K.',
    },
    {
      base: '/review-images/mark_ban_2',
      alt: 'WRP studio floor with pendant lights and the glass lounge above',
      caption: 'Pendant lights over the studio floor. Photo by customer Mark Ban.',
    },
  ],
  /** Verbatim review excerpts about the lounge. */
  quotes: [
    {
      text: 'It felt less like a standard garage and more like a high-end lounge.',
      author: 'Manohar C.',
    },
    {
      text: 'They even have a billiards area on the first floor, so you can relax and play while your car is being taken care of!',
      author: 'DhaneshKumar KV',
    },
    {
      text: 'The opportunity to play billiards while my car was being perfected… turning what is usually a boring wait into a genuinely enjoyable use of time.',
      author: 'Manohar C.',
    },
    {
      text: 'The whole place gives off a comfortable, welcoming “home” feeling.',
      author: 'Mark Ban',
    },
    { text: 'Also love the waiting area.', author: 'Shafan Maheen' },
  ],
};

/** Photos of the studio itself, for heroes and backdrops. */
export const studio = {
  night: { base: '/review-images/mark_ban_1', alt: 'WRP studio at night, the illuminated Wrap · Reinforce · Protect sign over two cars' },
  floor: { base: '/review-images/tariq_murad_3', alt: 'Cars in the WRP studio under black pendant lights' },
  bays: { base: '/review-images/venkat_k_2', alt: 'Supercars lined up inside the WRP studio' },
  logoWall: { base: '/review-images/sujith_prasad_2', alt: 'WRP logo wall in the studio' },
  craftsman: { base: '/luxury-car-detailing-craftsman-working-black-and-w', alt: 'Detailer polishing a car panel by hand' },
};

const business = getBusiness();
/**
 * Live Google Maps figures, read 27 Sep 2026 (Firecrawl maps-google-com).
 * data/google-reviews.json is the February scrape (68 reviews); the newest 60
 * on Maps (7 Mar to 26 Sep 2026) are all 5-star and 59 of them are new names,
 * so the listing has at least 127. "120+" is the honest floor.
 */
export const proof = {
  rating: business.rating.toFixed(1),
  reviewCount: 127,
  reviewCountDisplay: '120+',
  reviewsUrl: '/reviews/',
  films: [
    { name: 'Avery Dennison', logo: '/logos/avery-dennison.png' },
    { name: 'STEK', logo: '/logos/stek.png' },
  ],
};

export type Quote = { text: string; author: string; service?: string; photo?: string };

/**
 * Written Google reviews posted since the February scrape, verbatim (typos
 * kept), newest first. `service` matches a `services[].slug` where one fits.
 */
export const freshQuotes: (Quote & { when: string })[] = [
  { text: 'I got a PPF on my car. The service is amazing. Afzal kept me informed on the progress of the process. It’s been a really good experience with these guys.', author: 'Siddik Akbar', service: 'paint-protection-film', when: 'September 2026' },
  { text: 'Got my car detailed at WRP, and they did an amazing job honestly. The car was super dirty when i dropped it off and they made it look brand new inside and out.', author: 'Aadithya Dhanesh', service: 'premium-car-wash', when: 'September 2026' },
  { text: 'I went for the Matte black hood + spoiler combo and i must say that the result is outstanding. Huge thanks to Mr. Afzal and the remaining crew members.', author: 'A Khalid', when: 'August 2026' },
  { text: 'Very happy with their work. Got complete interior detailing done along with exterior wash for better paint. Quick turn around time too!', author: 'Muhammad Nadir', service: 'leather-upholstery', when: 'August 2026' },
  { text: 'The team is really humble and professional, The quality of work is spot on and will definitely be going back for the detailed wash.', author: 'Sunit Gonsalves', service: 'premium-car-wash', when: 'July 2026' },
  { text: 'Give a drity car get it clean by 24 hours car washing including cleaning inside deep cleaning best service must recommend for suv and small cars', author: 'Huzaifa Hamid', service: 'premium-car-wash', when: 'July 2026' },
  { text: 'Nice work done quickly and professionally. Detailing and ceramic coating polish works done efficiently!', author: 'James Daniel', service: 'ceramic-coating', when: 'July 2026' },
];

/** A handful of strong, short, verbatim review quotes. */
export function pickQuotes(count = 6): Quote[] {
  const reviews = getAllReviews();
  const withHighlight = reviews.filter((r: Review) => r.highlightQuote && r.stars === 5);
  const chosen = withHighlight.length >= count ? withHighlight : reviews.filter((r) => r.text.length > 60);
  return chosen.slice(0, count).map((r) => ({
    text: r.highlightQuote || firstSentence(r.text),
    author: r.reviewerName,
    service: r.serviceTags?.[0],
    photo: r.localImages?.[0] ? '/' + r.localImages[0].replace(/\.jpg$/, '') : undefined,
  }));
}

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > 180 ? s.slice(0, 177) + '…' : s;
}

export const nav = [
  { label: 'Services', href: '#services' },
  { label: 'Lounge', href: '#lounge' },
  { label: 'Work', href: '#work' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Visit', href: '#visit' },
];

export const pages = {
  blog: '/blog/',
  portfolio: '/portfolio/',
  reviews: '/reviews/',
  about: '/more-about-wrp/',
  contact: '/contact-us/',
  privacy: '/privacy/',
  terms: '/terms/',
  arabic: '/ar/',
};
