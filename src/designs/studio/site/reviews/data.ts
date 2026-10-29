/**
 * Everything the Studio reviews page shows, worked out once and shared by the
 * page and its concept directions (review-concepts/): the live page's title,
 * description and JSON-LD, the review lists, and the filters the concepts use.
 * Copy is the live src/pages/reviews.astro's, word for word.
 */
import { getAllReviews, getReviewsWithImages, getBusiness, getMarqueeReviews, getDisplayCount, getSchemaReviews, type Review } from '@/lib/reviews';
import { toLocalNum } from '@/i18n/utils';
import type { Locale } from '@/i18n/translations';

export function reviewsPage(locale: Locale) {
  const business = getBusiness();
  const displayCount = getDisplayCount();
  const num = (n: string | number) => toLocalNum(n, locale);
  const title =
    locale === 'ar'
      ? `تقييمات العملاء | WRP Detailing Studio - ${toLocalNum(displayCount, 'ar')} تقييمات جوجل`
      : `Client Reviews | WRP Detailing Studio – ${business.rating.toFixed(1)} Stars, ${displayCount} Google Reviews`;
  const description =
    locale === 'ar'
      ? `اقرأ ${toLocalNum(displayCount, 'ar')} من تقييمات جوجل الموثقة لعملاء WRP Detailing Studio. تقييم ${toLocalNum(business.rating.toFixed(1), 'ar')} نجوم لخدمات التلميع وطلاء السيراميك وPPF وتظليل النوافذ في دبي.`
      : `Read ${displayCount} verified Google reviews from WRP Detailing Studio clients. ${business.rating.toFixed(1)}-star rated car detailing, PPF, ceramic coating, and window tinting in Dubai.`;

  // The live page's AggregateRating + Review JSON-LD, built the same way.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://wrpdetailing.ae/#localbusiness',
    name: 'WRP Detailing Studio',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: business.rating.toString(),
      reviewCount: business.totalReviews.toString(),
      bestRating: '5',
      worstRating: '1',
    },
    review: getSchemaReviews(10).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewerName },
      reviewRating: { '@type': 'Rating', ratingValue: r.stars.toString(), bestRating: '5' },
      reviewBody: r.text.slice(0, 500),
      datePublished: new Date().toISOString().split('T')[0],
    })),
  };

  const marquee = getMarqueeReviews();
  const mid = Math.ceil(marquee.length / 2);
  const joinLine =
    locale === 'ar'
      ? `انضم إلى ${num(displayCount)} من العملاء الراضين الذين يثقون بـ WRP للعناية بسياراتهم.`
      : `Join ${displayCount} satisfied customers who trust WRP with their vehicles.`;

  return {
    business,
    displayCount,
    num,
    title,
    description,
    schema,
    marquee,
    rows: [marquee.slice(0, mid), marquee.slice(mid)],
    withImages: getReviewsWithImages(),
    textOnly: getAllReviews().filter((r) => !r.localImages?.length && r.text.length > 30),
    joinLine,
  };
}

/** A way to narrow the review wall: the reviews it keeps, and words to mark in them. */
export interface ReviewFilter {
  id: string;
  label: string;
  ids: string[];
  /** A regular expression source; matches are highlighted in the kept reviews. */
  terms?: string;
}

const serviceLabels: { tags: string[]; en: string; ar: string }[] = [
  { tags: ['premium-car-wash'], en: 'Detailing', ar: 'التنظيف والتفصيل' },
  { tags: ['paint-protection-film'], en: 'PPF', ar: 'PPF' },
  { tags: ['window-film'], en: 'Tint', ar: 'التظليل' },
  { tags: ['polish', 'ceramic-coating'], en: 'Polish & ceramic', ar: 'التلميع والسيراميك' },
  { tags: ['leather-upholstery', 'car-mats'], en: 'Interior', ar: 'المقصورة' },
];

/** The services the reviews are tagged with, biggest first. */
export function serviceFilters(reviews: Review[], locale: Locale): ReviewFilter[] {
  return serviceLabels
    .map((s) => ({
      id: s.tags[0],
      label: s[locale],
      ids: reviews.filter((r) => r.serviceTags?.some((t) => s.tags.includes(t))).map((r) => r.reviewId),
    }))
    .filter((f) => f.ids.length > 0);
}

/**
 * Things customers keep bringing up, found in their own words. Each matches
 * the review text, so the counts are always the library's.
 */
const topics: { id: string; en: string; terms: string }[] = [
  { id: 'brand-new', en: '“Brand new”', terms: 'brand[- ]new|showroom|like new|very new' },
  { id: 'professional', en: '“Professional”', terms: 'professional(?:ism|ly)?' },
  { id: 'detail', en: '“Attention to detail”', terms: 'attention to detail|to the detail|detail-oriented|meticulous' },
  { id: 'afzal', en: 'Afzal', terms: 'afzal' },
  { id: 'lounge', en: 'The lounge', terms: 'lounge|waiting area|coffee|pool table|play area|relax' },
  { id: 'price', en: 'The price', terms: 'pric(?:e|es|ing)|money|fair|reasonable|afford' },
  { id: 'flawless', en: '“Flawless”', terms: 'flawless|perfect(?:ly|ion)?|spotless' },
];

export function topicFilters(reviews: Review[]): ReviewFilter[] {
  return topics
    .map((t) => {
      const re = new RegExp(`\\b(?:${t.terms})`, 'i');
      return { id: t.id, label: t.en, terms: t.terms, ids: reviews.filter((r) => re.test(r.text)).map((r) => r.reviewId) };
    })
    .filter((f) => f.ids.length > 1);
}

/** The shortest striking line in a review: its highlight quote, or its first sentence. */
export function pullLine(r: Review, max = 90): string {
  if (r.highlightQuote) return r.highlightQuote;
  const first = r.text.split(/(?<=[.!?…])\s+/)[0].replace(/^["“]|["”]$/g, '');
  return first.length <= max ? first : first.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/**
 * Short lines lifted word for word from reviews in the library (a picked
 * phrase, as the reviewer wrote it). A phrase that is no longer in its review
 * is dropped, so a sticker can never misquote anyone.
 */
const stickerPicks: [name: string, phrase: string][] = [
  ['Andrew Dalida', 'emerged from the showroom'],
  ['xiii adventures', "didn't cut any corners"],
  ['Ashik Mubarak', 'you can see where the money goes'],
  ['arun prasad', 'completely transformed the car'],
  ['Mathieu Garvi (France)', 'Never seen my car so clean!'],
  ['Shamim J Mahal', 'a hidden gem in Al Qusais'],
  ['Ciby Koshy', 'an amazing glossy finish'],
  ['Chad Nikko alticen germanes', 'look brand new again'],
];

export function stickers(): { name: string; line: string }[] {
  const all = getAllReviews();
  return stickerPicks.flatMap(([name, phrase]) => {
    const r = all.find((x) => x.reviewerName === name);
    const at = r ? r.text.toLowerCase().indexOf(phrase.toLowerCase()) : -1;
    return r && at >= 0 ? [{ name: r.reviewerName, line: r.text.slice(at, at + phrase.length) }] : [];
  });
}
