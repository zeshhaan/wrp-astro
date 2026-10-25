/**
 * The link set every Studio header variant renders, in English or Arabic.
 *
 * It is the live site's navigation (src/components/Navigation.astro), so a
 * variant can replace the header without changing a single internal link:
 * the six service pages (car wash last), Blog, Portfolio, Reviews, About and
 * Contact, the home logo, the language switch and the tracked phone/maps links.
 * Labels come from the live translations and the service .mdx titles.
 */
import { getCollection } from 'astro:content';
import { localizeUrl, toLocalNum } from '@/i18n/utils';
import { t, type Locale } from '@/i18n/translations';
import { contact, proof, services as serviceData, type Service } from '../../data';

export type NavService = {
  slug: string;
  name: string;
  href: string;
  /** "From AED 999", or the "priced after inspection" line. */
  price: string;
  time: string;
  line: string;
  image: string;
  imageAlt: string;
  pillar: Pillar;
};

export type Pillar = 'wrap' | 'reinforce' | 'protect';

/**
 * Services under the W·R·P pillars as the live homepage's "WRP Philosophy"
 * describes them: PPF and ceramic reinforce, polish and washing protect,
 * film on the glass and the cabin wrap.
 */
const pillarOf: Record<string, Pillar> = {
  'paint-protection-film': 'reinforce',
  'ceramic-coating': 'reinforce',
  polish: 'protect',
  'premium-car-wash': 'protect',
  'window-film': 'wrap',
  'leather-upholstery': 'wrap',
};

const words = {
  en: {
    quote: 'Get a quick quote',
    whatsapp: 'WhatsApp us',
    call: 'Call us',
    menu: 'Menu',
    close: 'Close menu',
    from: 'From',
    inspection: 'Priced after inspection',
    closed: 'Closed Friday',
    openNow: 'Open now',
    until: 'until 9:30 PM',
    closedNow: 'Closed now',
    opensAt: 'opens 9 AM',
    opensSat: 'opens Saturday 9 AM',
    reviews: 'Google reviews',
    allServices: 'All services',
    index: 'The WRP index',
    talk: 'Not sure which one?',
    talkLine: 'Send us a photo of your car and we will tell you what it needs.',
    skip: 'Skip to content',
    home: 'WRP by YACO Automotive, home',
  },
  ar: {
    quote: 'احصل على عرض سعر سريع',
    whatsapp: 'راسلنا على واتساب',
    call: 'اتصل بنا',
    menu: 'القائمة',
    close: 'إغلاق القائمة',
    from: 'من',
    inspection: 'السعر بعد المعاينة',
    closed: 'الجمعة مغلق',
    openNow: 'مفتوح الآن',
    until: 'حتى ٩:٣٠ م',
    closedNow: 'مغلق الآن',
    opensAt: 'نفتح ٩ ص',
    opensSat: 'نفتح السبت ٩ ص',
    reviews: 'تقييمات Google',
    allServices: 'كل الخدمات',
    index: 'فهرس WRP',
    talk: 'لست متأكدًا؟',
    talkLine: 'أرسل لنا صورة سيارتك وسنخبرك بما تحتاجه.',
    skip: 'تخطَّ إلى المحتوى',
    home: 'WRP by YACO Automotive، الصفحة الرئيسية',
  },
};

export type HeaderWords = (typeof words)['en'];

export async function getHeaderNav(locale: Locale) {
  const isArabic = locale === 'ar';
  const num = (n: string | number) => toLocalNum(n, locale);
  const aed = (n: number) => (isArabic ? `${num(n.toLocaleString('en-US'))} درهم` : `AED ${n.toLocaleString('en-US')}`);
  const w = words[locale];

  const entries = (await getCollection('services')).filter((s) => (isArabic ? s.id.startsWith('ar/') : !s.id.startsWith('ar/')));
  const services: NavService[] = entries
    .map((entry) => {
      const slug = entry.id.replace(/^ar\//, '');
      const data = serviceData.find((s) => s.slug === slug) as Service;
      return {
        slug,
        name: entry.data.title,
        href: localizeUrl(`/services/${slug}/`, locale),
        price: data.from ? `${w.from} ${aed(data.from)}` : w.inspection,
        time: isArabic ? '' : data.time,
        line: isArabic ? entry.data.description : data.line,
        image: data.image,
        imageAlt: data.imageAlt,
        pillar: pillarOf[slug],
      };
    })
    // Car wash last, as in the live navigation.
    .sort((a, b) => Number(a.slug === 'premium-car-wash') - Number(b.slug === 'premium-car-wash'));

  const pages = [
    { key: 'portfolio', label: t(locale, 'nav.portfolio'), href: localizeUrl('/portfolio/', locale) },
    { key: 'reviews', label: t(locale, 'nav.reviews'), href: localizeUrl('/reviews/', locale) },
    { key: 'about', label: t(locale, 'nav.about'), href: localizeUrl('/more-about-wrp/', locale) },
    { key: 'blog', label: t(locale, 'nav.blog'), href: localizeUrl('/blog/', locale) },
    { key: 'contact', label: t(locale, 'nav.contact'), href: localizeUrl('/contact-us/', locale) },
  ];

  const pillars: { key: Pillar; letter: string; name: string; href: string; services: NavService[] }[] = (
    ['wrap', 'reinforce', 'protect'] as const
  ).map((key) => ({
    key,
    letter: key[0].toUpperCase(),
    name: t(locale, `home.pillars.${key}.title`),
    href: localizeUrl(`/${key}/`, locale),
    services: services.filter((s) => s.pillar === key),
  }));

  return {
    locale,
    dir: isArabic ? ('rtl' as const) : ('ltr' as const),
    words: w,
    servicesLabel: t(locale, 'nav.services'),
    services,
    pages,
    pillars,
    home: localizeUrl('/', locale),
    langLabel: isArabic ? t(locale, 'lang.switchToEnglish') : t(locale, 'lang.switchToArabic'),
    // Same tracked short links as the live trust bar.
    phone: { display: num('+971 54 717 3000'), href: 'https://dub.sh/wrp-phone' },
    maps: { label: t(locale, 'home.contact.address1'), href: 'https://dub.sh/wrp-map' },
    hours: t(locale, 'nav.hours'),
    schedule: contact.schedule,
    rating: { value: num(proof.rating), count: num(proof.reviewCountDisplay), href: localizeUrl(proof.reviewsUrl, locale) },
  };
}

export type HeaderNav = Awaited<ReturnType<typeof getHeaderNav>>;
