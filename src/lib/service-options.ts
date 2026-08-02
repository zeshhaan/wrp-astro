import type { Locale } from '@/i18n/translations';

/**
 * Single source of truth for the "Service Interest" dropdown.
 *
 * There are four of these selects on the site (the two homepages and the two
 * contact pages) and they had already drifted apart: the contact pages carried
 * `value` slugs while the homepages submitted their visible labels, in two
 * different languages, against a different taxonomy. That put three vocabularies
 * into one `service_interest` column in D1. Rendering all four from this list
 * via ServiceOptions.astro is what stops it happening again.
 *
 * The catalogue mirrors the active service categories in the WRP Billing system
 * (organization "W R P CAR POLISH SERVICES LLC"), minus the internal ones
 * (Garage, Garage Wash, Recovery Charge) and the ad-hoc line items that nobody
 * would search for (Stickering, Defogger light, Ceramic Installation).
 *
 * `value` is what gets stored, so treat these slugs as stable: changing one
 * silently orphans every historical submission that used it.
 */
export type ServiceOption = {
  value: string;
  en: string;
  ar: string;
};

export type ServiceOptionGroup = {
  en: string;
  ar: string;
  options: ServiceOption[];
};

export const SERVICE_OPTION_GROUPS: ServiceOptionGroup[] = [
  {
    en: 'Paint Protection & Coatings',
    ar: 'حماية الطلاء والطلاءات',
    options: [
      {
        value: 'paint-protection-film',
        en: 'Paint Protection Film (PPF)',
        ar: 'فيلم حماية الطلاء (PPF)',
      },
      { value: 'ppf-removal', en: 'PPF Removal', ar: 'إزالة فيلم حماية الطلاء' },
      { value: 'ceramic-coating', en: 'Ceramic Coating', ar: 'طلاء السيراميك' },
      { value: 'borophene-coating', en: 'Borophene Coating', ar: 'طلاء البوروفين' },
    ],
  },
  {
    en: 'Wrap & Styling',
    ar: 'التغليف والتجميل',
    options: [
      { value: 'wrapping', en: 'Vehicle Wrapping', ar: 'تغليف السيارات' },
      {
        value: 'chrome-delete',
        en: 'Chrome Delete (Trim Blackout)',
        ar: 'تظليل الكروم (طلاء الزخارف بالأسود)',
      },
    ],
  },
  {
    en: 'Paint & Bodywork',
    ar: 'الطلاء وأعمال الهيكل',
    options: [
      { value: 'polish', en: 'Car Polish & Paint Correction', ar: 'تلميع وتصحيح الطلاء' },
      {
        value: 'pdr',
        en: 'Paintless Dent Repair (PDR)',
        ar: 'إصلاح الانبعاجات بدون طلاء',
      },
      {
        value: 'headlight-polish',
        en: 'Headlight Polish & Restoration',
        ar: 'تلميع وتجديد المصابيح الأمامية',
      },
    ],
  },
  {
    en: 'Glass & Tint',
    ar: 'الزجاج والتظليل',
    options: [
      {
        value: 'window-film',
        en: 'Window Tinting & Window Film',
        ar: 'تظليل النوافذ وأفلام الزجاج',
      },
    ],
  },
  {
    en: 'Cleaning & Detailing',
    ar: 'التنظيف والعناية',
    options: [
      { value: 'premium-car-wash', en: 'Premium Car Wash', ar: 'غسيل سيارات فاخر' },
      { value: 'steam-wash', en: 'Steam Wash', ar: 'غسيل بالبخار' },
      {
        value: 'interior-deep-cleaning',
        en: 'Interior Deep Cleaning',
        ar: 'تنظيف عميق للمقصورة الداخلية',
      },
    ],
  },
  {
    en: 'Leather & Upholstery',
    ar: 'الجلود والتنجيد',
    options: [
      {
        value: 'leather-upholstery',
        en: 'Leather & Upholstery Care',
        ar: 'العناية بالجلد والتنجيد',
      },
      { value: 'custom-seat-covers', en: 'Custom Seat Covers', ar: 'أغطية مقاعد مخصّصة' },
      {
        value: 'premium-floor-mats',
        en: 'Premium Floor Mats (2D, 5D & 7D)',
        ar: 'دعّاسات فاخرة (2D و5D و7D)',
      },
      { value: 'full-seat-upholstery', en: 'Full Seat Upholstery', ar: 'تنجيد المقاعد بالكامل' },
      {
        value: 'commercial-fleet-upholstery',
        en: 'Commercial Fleet Upholstery',
        ar: 'تنجيد الأساطيل التجارية',
      },
    ],
  },
];

/**
 * Deliberately last and outside any group. Someone describing a job we do not
 * have a name for should not have to force-fit it into the nearest category:
 * that is how an interior strip-and-shampoo request ended up filed under
 * "premium-car-wash".
 */
export const SERVICE_OPTION_OTHER: ServiceOption = {
  value: 'other',
  en: 'Other / Not sure',
  ar: 'خدمة أخرى / غير متأكد',
};

export function label(item: { en: string; ar: string }, locale: Locale | string | undefined) {
  return locale === 'ar' ? item.ar : item.en;
}
