/**
 * Shared content for the Studio design (the chosen homepage direction) and its
 * quote flows.
 *
 * Prices come from the `startingPrice` fields in src/content/services/*.mdx and
 * the lounge details from verified Google reviews (data/google-reviews.json).
 * Where a service has no published starting price we say so rather than invent one.
 */
import { getBusiness } from '@/lib/reviews';

// Contact links go through WRP's dub.sh short links, as on the live site, so
// clicks are counted in Dub and analytics (src/components/Analytics.astro).
export const contact = {
  phoneDisplay: '+971 54 717 3000',
  phoneHref: 'https://dub.sh/wrp-phone',
  whatsapp: 'https://dub.sh/wrp-wa',
  email: 'info@wrpdetailing.ae',
  emailHref: 'https://dub.sh/wrp-email',
  instagram: 'https://dub.sh/wrp_ig',
  instagramHandle: '@wrp_ae',
  address: ['Al Qusais Industrial Area 1', 'Dubai, United Arab Emirates'],
  mapsUrl: 'https://dub.sh/wrp-map',
  hours: 'Saturday to Thursday, 9:00 AM to 9:30 PM',
  hoursShort: 'Sat–Thu 9 AM–9:30 PM',
  closed: 'Closed Friday',
  /** Opening hours in Dubai local time (UTC+4, no DST). 5 = Friday. */
  schedule: { open: '09:00', close: '21:30', closedDays: [5] as number[], timeZone: 'Asia/Dubai' },
};

/** Build a WhatsApp link with a prefilled message (Dub passes the query string on to WhatsApp). */
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
    line: 'A hand wash with pH-neutral products and filtered rinse water, sealed with ceramic rather than wax.',
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

export const work = [
  { title: 'Porsche Boxster Spyder', what: 'Full paint protection', image: '/portfolio/porsche-boxster-spyder-gray' },
  { title: 'Porsche 911', what: 'Ceramic coating & detailing', image: '/portfolio/green-porsche-911-showroom-event' },
  { title: 'Lotus Exige', what: 'Paint correction & ceramic', image: '/portfolio/burgundy-lotus-showroom-display' },
  { title: 'Subaru WRX STI', what: 'Wash & paint protection', image: '/portfolio/blue-subaru-wrx-sti-showroom' },
  { title: 'Lexus LX 570', what: 'Full detailing package', image: '/portfolio/black-lexus-lx-570-showroom' },
  { title: 'Toyota Supra & Lotus', what: 'Showroom detailing', image: '/portfolio/lotus-toyota-supra-showroom-duo' },
];

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

const business = getBusiness();
/**
 * Live Google Maps figures, read 27 Sep 2026: 5.0 from 130 reviews (TinyFish
 * read of the listing; Firecrawl's newest-60 pull agrees, all 5-star).
 * data/google-reviews.json is the older February scrape (68 reviews).
 * "120+" stays as the display so the copy doesn't date as reviews arrive.
 * Google's topic chips: professional team 23, car detailing 12, attention to
 * work 9, interior cleaning 7, window tint 5, detailed wash 4, polite team 4,
 * clear explanations 3, ceramic coating 2, showroom shine 2.
 */
export const proof = {
  rating: business.rating.toFixed(1),
  reviewCount: 130,
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

export const pages = {
  blog: '/blog/',
  portfolio: '/portfolio/',
  reviews: '/reviews/',
  about: '/more-about-wrp/',
  contact: '/contact-us/',
  privacy: '/privacy/',
  terms: '/terms/',
  credits: '/credits/',
  arabic: '/ar/',
};
