/**
 * Studio concept: local content built on the shared data.
 * Everything here is either from data.ts, the service .mdx files, or verbatim
 * Google reviews (REVIEWS.md, read 27 Sep 2026). No invented counts or years.
 */
import { contact, freshQuotes, proof, services, whatsappLink, type Service } from '../data';

export const whatsappQuote = whatsappLink('Hi WRP, I would like a quote for my car.');

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;

export type Card = {
  key: string;
  name: string;
  line: string;
  price: string;
  href: string;
  linkLabel: string;
  image: string;
  alt: string;
  width: number;
  height: number;
};

const bySlug = (slug: string) => services.find((s) => s.slug === slug) as Service;
const priceOf = (s: Service) => (s.from ? `From ${aed(s.from)}` : 'Priced after inspection');
const fromService = (slug: string, over: Partial<Card> = {}): Card => {
  const s = bySlug(slug);
  return {
    key: s.slug,
    name: s.name,
    line: s.line,
    price: priceOf(s),
    href: s.href,
    linkLabel: `Learn more about ${s.name}`,
    image: s.image,
    alt: s.imageAlt,
    width: 1200,
    height: 1600,
    ...over,
  };
};

/**
 * Service cards, in the owner's order of emphasis. "Detailing" is the Level 3
 * detail from premium-car-wash.mdx (AED 300 sedan / 325 SUV), shown as its own
 * card because customers ask for it by name; it links to the wash page where the
 * levels are listed.
 */
export const serviceCards: Card[] = [
  fromService('paint-protection-film'),
  {
    key: 'detailing',
    name: 'Detailing',
    line: 'Our Level 3 detail, inside and out: tar and iron removal, carpet extraction, engine bay and six months of ceramic.',
    price: `From ${aed(300)}`,
    href: '/services/premium-car-wash/',
    linkLabel: 'Learn more about detailing levels',
    image: '/portfolio/black-lexus-lx-570-showroom',
    alt: 'Black Lexus LX 570 after a Level 3 detail at WRP',
    width: 1200,
    height: 1269,
  },
  fromService('polish'),
  fromService('ceramic-coating', { width: 1179, height: 2091 }),
  fromService('leather-upholstery', { width: 1199, height: 800 }),
  fromService('window-film', { width: 1024, height: 1024 }),
  fromService('premium-car-wash', {
    image: '/portfolio/team-washing-subaru-sti-foam',
    alt: 'WRP team hand washing a blue Subaru WRX STI covered in foam',
    height: 1471,
  }),
  {
    key: 'wrap',
    name: 'Wrap & styling',
    line: 'Partial wraps and details, like a matte-black bonnet and spoiler or a chrome delete.',
    price: 'Priced after inspection',
    href: '/contact-us/',
    linkLabel: 'Ask about wrap and styling',
    image: '/review-images/sujith_prasad_2',
    alt: 'The WRP logo wall above two cars in the studio',
    width: 1200,
    height: 900,
  },
];

/** Options for the quote form's service select. */
export const serviceOptions = [
  'Paint protection film (PPF)',
  'Detailing',
  'Polish & paint correction',
  'Ceramic coating',
  'Leather & upholstery',
  'Window film',
  'Premium car wash',
  'Wrap & styling',
  'Not sure yet',
];

export type Review = { text: string; author: string; service: string };

/**
 * Verbatim Google reviews: the newest (freshQuotes) plus the strongest earlier
 * ones about specific services. Excerpts are whole sentences, typos kept.
 */
const fresh = (author: string, service: string): Review => {
  const q = freshQuotes.find((f) => f.author === author);
  if (!q) throw new Error(`studio: missing fresh quote for ${author}`);
  return { text: q.text, author: q.author, service };
};

export const reviews: Review[] = [
  fresh('Siddik Akbar', 'Paint protection film'),
  {
    text: 'The team kept me updated throughout the process with pictures and videos, and the workmanship is truly amazing. Car was delivered exactly on the promised time.',
    author: 'Leno Thomas',
    service: 'Ceramic coating, FJ Cruiser',
  },
  fresh('Aadithya Dhanesh', 'Detailing'),
  {
    text: 'They matched the PPF exactly with the same quality and finish as the existing film on the car, and the result is seamless — it blends in like factory installation with excellent attention to detail.',
    author: 'DhaneshKumar KV',
    service: 'PPF re-install & floor mats',
  },
  fresh('A Khalid', 'Wrap: matte black bonnet & spoiler'),
  {
    text: 'The seat stitching quality is flawless and looks factory-finished. The full car detailing was done to perfection, and the engine compartment cleaning was incredibly thorough and professionally handled.',
    author: 'Abhi Urs',
    service: 'Upholstery & detailing',
  },
  {
    text: 'The shine after the polish was unreal, and the interior looked cleaner than the day I bought it. They kept me updated, delivered on time, and didn’t try to push any unnecessary extras.',
    author: 'Ameena Shajahan',
    service: 'Polish & detailing',
  },
  fresh('Muhammad Nadir', 'Interior detailing & wash'),
  {
    text: 'I choose avery dennison ppf for my car The team explained everything clearly and delivered on time. My car looks brand new and so easy to maintain now.',
    author: 'Salim Sali',
    service: 'PPF & window tint',
  },
  {
    text: 'The interior now looks and smells brand new, and I can see my reflection in the exterior paint.',
    author: 'Azhar Pallikkal',
    service: 'Interior detailing, Altima',
  },
  fresh('James Daniel', 'Detailing & ceramic, Tesla Model 3'),
];

/** Why choose WRP: each point is backed by what customers wrote. */
export const whyPoints = [
  {
    icon: 'camera',
    title: 'Photo & video updates',
    body: 'We send pictures and videos while we work, so you can see the progress without driving over.',
    quote: 'Kept me updated throughout the process with pictures and videos.',
    author: 'Leno Thomas',
  },
  {
    icon: 'clock',
    title: 'Ready when we say',
    body: 'We give you a handover time before we start, and we keep to it.',
    quote: 'Car was delivered exactly on the promised time.',
    author: 'Leno Thomas',
  },
  {
    icon: 'shield',
    title: 'Proper films, real warranties',
    body: 'Avery Dennison and STEK paint protection film with up to 10 years of warranty. Ceramic coatings carry 2 to 7 years.',
    quote: 'I choose avery dennison ppf for my car.',
    author: 'Salim Sali',
  },
  {
    icon: 'tag',
    title: 'Fair prices, no pressure',
    body: 'Starting prices are on this page. We explain the options and you choose; we don’t push extras.',
    quote: 'Didn’t try to push any unnecessary extras.',
    author: 'Ameena Shajahan',
  },
] as const;

/** Only figures we can stand behind. */
export const stats = [
  { value: proof.rating, label: 'Google rating' },
  { value: proof.reviewCountDisplay, label: 'Google reviews' },
  { value: '10 yrs', label: 'Longest PPF warranty' },
  { value: '6 days', label: 'Open Sat–Thu' },
];

export const aboutChecklist = [
  'Avery Dennison & STEK paint protection film',
  'Up to 10-year warranty on PPF',
  'Ceramic coatings with 2 to 7-year warranties',
  'Hand wash only, with filtered rinse water',
];

/** Blog posts to feature (ids in src/content/blog); only ones that exist are shown. */
// Chosen for their covers (bright, subject clear of the text, three different kinds of shot):
// PPF in the WRP studio, window film being fitted, and a leather interior.
export const blogIds = ['what-makes-a-premium-ppf-installation-different', 'professional-window-film-installation', 'leather-upholstery-care-dubai-guide'];

export const loungeList = ['Billiards', 'Board games', 'Coffee & karak', 'Big-screen TV', 'Air-conditioned', 'Glass wall over the bays'];

export { contact, proof };
