/**
 * Arabic copy for the Studio homepage (site/ArHomePage.astro), translated from
 * the English copy in content.ts and data.ts. Prices, links, photos and review
 * texts come from the English data, so the two homepages cannot drift apart.
 * Needs a native speaker's read before it goes live.
 */
import { toLocalNum } from '@/i18n/utils';
import { contact, lounge, proof, whatsappLink, work } from '../data';
import { reviews, serviceCards, whyPhotos, type Card, type Review } from './content';

export const num = (n: string | number) => toLocalNum(n, 'ar');

/** "5,999" → "٥٬٩٩٩", with the Arabic thousands separator. */
const amount = (n: number) => num(n.toLocaleString('en-US')).replace(/,/g, '٬');

/** "120+" → "+١٢٠", the way the live Arabic pages write counts. */
export const reviewCount = `+${num(proof.reviewCountDisplay.replace('+', ''))}`;
export const rating = num(proof.rating);

/**
 * The phone number in Arabic digits. Spaces between Arabic-digit groups count
 * as right to left, which flips the groups round even inside dir="ltr"; a
 * left-to-right mark after each space keeps them in order.
 */
export const phone = num(contact.phoneDisplay).replace(/ /g, ' \u200e');

export const whatsappQuote = whatsappLink('مرحباً WRP، أود الحصول على عرض سعر لسيارتي.');

const cardCopy: Record<string, Pick<Card, 'name' | 'line' | 'linkLabel' | 'alt'>> = {
  'paint-protection-film': {
    name: 'فيلم حماية الطلاء (PPF)',
    line: 'فيلم شفاف ذاتي الإصلاح يحمي طلاء سيارتك من الحصى والرمل وحرارة الخليج.',
    linkLabel: 'اعرف المزيد عن فيلم حماية الطلاء',
    alt: 'بورشه بوكستر سبايدر رمادية بعد تركيب فيلم حماية الطلاء بالكامل في WRP',
  },
  detailing: {
    name: 'العناية الشاملة (ديتيلنج)',
    line: 'عناية من المستوى الثالث من الداخل والخارج: إزالة الشوائب الحديدية، وتنظيف السجاد بالبخار، وتنظيف حجرة المحرك، وطبقة سيراميك واقية تدوم ٦ أشهر.',
    linkLabel: 'اعرف المزيد عن مستويات العناية الشاملة',
    alt: 'لكزس LX 570 سوداء بعد عناية شاملة من المستوى الثالث في WRP',
  },
  polish: {
    name: 'تلميع وتصحيح الطلاء',
    line: 'تلميع آلي على عدة مراحل يزيل الخدوش الدائرية والخدوش والأكسدة، مع قياس سماكة الطلاء بجهاز خاص.',
    linkLabel: 'اعرف المزيد عن تلميع وتصحيح الطلاء',
    alt: 'لوتس إكسيج عنابية بعد تصحيح الطلاء وطلاء السيراميك',
  },
  'ceramic-coating': {
    name: 'طلاء السيراميك',
    line: 'طبقة زجاجية من السيراميك طاردة للماء تمنح لمعاناً عالياً ومقاومة للمواد الكيميائية وغسيلاً أسهل.',
    linkLabel: 'اعرف المزيد عن طلاء السيراميك',
    alt: 'بورشه 911 خضراء بطلاء سيراميك جديد في فعالية عرض لـ WRP',
  },
  'leather-upholstery': {
    name: 'الجلد والتنجيد',
    line: 'أغطية مقاعد حسب الطلب، وتنجيد جلد مخيط يدوياً، ودواسات أرضية على مقاس سيارتك، نصنعها في معمل التصميم بالطابق العلوي.',
    linkLabel: 'اعرف المزيد عن الجلد والتنجيد',
    alt: 'مقعد سيارة منجّد بجلد مخيط يدوياً',
  },
  'window-film': {
    name: 'تظليل النوافذ',
    line: 'تظليل نانو سيراميك يحجب حتى ٩٩٪ من الأشعة فوق البنفسجية وحرارة الشمس، من دون أن يضعف إشارة هاتفك.',
    linkLabel: 'اعرف المزيد عن تظليل النوافذ',
    alt: 'لقطة قريبة لسيارة سيدان فاخرة بتظليل نوافذ سيراميك',
  },
  'premium-car-wash': {
    name: 'غسيل سيارات فاخر',
    line: 'غسيل يدوي آمن بشامبو متعادل الحموضة وقفازات مايكروفايبر وشطف بمياه مفلترة منزوعة الأيونات، مع رذاذ سيراميك يحمي اللمعة.',
    linkLabel: 'اعرف المزيد عن الغسيل الفاخر',
    alt: 'فريق WRP يغسل سوبارو WRX STI زرقاء مغطاة بالرغوة يدوياً',
  },
  wrap: {
    name: 'التغليف والتعديلات الجمالية',
    line: 'تغليف فينيل جزئي، ولمسات على الكبوت، وتغليف القطع بالأسود الساتان، وإزالة الكروم، بحواف نظيفة ومثبّتة بإتقان.',
    linkLabel: 'استفسر عن التغليف والتعديلات الجمالية',
    alt: 'جدار شعار WRP فوق سيارتين في الاستوديو',
  },
  'architectural-tint': {
    name: 'تظليل زجاج المنازل والمباني',
    line: 'حماية من الحرارة والأشعة فوق البنفسجية بأفلام معمارية فاخرة، لأجواء داخلية أبرد وخصوصية أكبر.',
    linkLabel: 'استفسر عن تظليل زجاج المنازل والمباني',
    alt: 'صالة الطابق العلوي بجدارها الزجاجي فوق ورش استوديو WRP',
  },
};

/** The nine service cards, in the same order and with the same prices as the English ones. */
export const serviceCardsAr: Card[] = serviceCards.map((c) => {
  const copy = cardCopy[c.key];
  if (!copy) throw new Error(`studio: missing Arabic copy for the ${c.key} card`);
  return { ...c, ...copy, price: c.from ? `من ${amount(c.from)} د.إ` : 'السعر بعد معاينة السيارة' };
});

export const serviceOptionsAr = [
  'فيلم حماية الطلاء (PPF)',
  'العناية الشاملة (ديتيلنج)',
  'تلميع وتصحيح الطلاء',
  'طلاء السيراميك',
  'الجلد والتنجيد',
  'تظليل النوافذ',
  'غسيل سيارات فاخر',
  'التغليف والتعديلات الجمالية',
  'تظليل زجاج المنازل والمباني',
  'لست متأكداً بعد',
];

/** The English reviews' service tags in Arabic. The review texts stay as the customers wrote them. */
const reviewService: Record<string, string> = {
  'Paint protection film': 'فيلم حماية الطلاء',
  'Ceramic coating, FJ Cruiser': 'طلاء سيراميك، FJ كروزر',
  Detailing: 'عناية شاملة',
  'PPF re-install & floor mats': 'إعادة تركيب PPF ودواسات أرضية',
  'Wrap: matte black bonnet & spoiler': 'تغليف: كبوت وجناح خلفي بالأسود المطفي',
  'Upholstery & detailing': 'تنجيد وعناية شاملة',
  'Polish & detailing': 'تلميع وعناية شاملة',
  'Interior detailing & wash': 'تنظيف داخلي وغسيل',
  'PPF & window tint': 'PPF وتظليل نوافذ',
  'Interior detailing, Altima': 'تنظيف داخلي، ألتيما',
  'Detailing & ceramic, Tesla Model 3': 'عناية شاملة وسيراميك، تسلا موديل 3',
};
export const reviewsAr: Review[] = reviews.map((r) => {
  const service = reviewService[r.service];
  if (!service) throw new Error(`studio: missing Arabic tag for the review service "${r.service}"`);
  return { ...r, service };
});

/**
 * Why choose WRP. The customer quotes are translated (and the page says so);
 * the originals are in content.ts.
 */
export const whyPointsAr = [
  {
    title: 'صور وفيديوهات أثناء العمل',
    body: 'نرسل لك صوراً وفيديوهات ونحن نعمل، فتتابع سيارتك خطوة بخطوة من دون أن تضطر للحضور.',
    quote: 'أبقوني على اطلاع طوال العملية بالصور والفيديوهات.',
    author: 'Leno Thomas',
  },
  {
    title: 'جاهزة في الموعد',
    body: 'نحدد لك موعد التسليم قبل أن نبدأ، ونلتزم به.',
    quote: 'استلمت السيارة في الموعد الذي وعدوني به تماماً.',
    author: 'Leno Thomas',
  },
  {
    title: 'أفلام أصلية وضمان حقيقي',
    body: 'أفلام حماية الطلاء من Avery Dennison وSTEK بضمان يصل إلى ١٠ سنوات، وطلاءات السيراميك بضمان من سنتين إلى ٧ سنوات.',
    quote: 'اخترت فيلم حماية الطلاء من Avery Dennison لسيارتي.',
    author: 'Salim Sali',
  },
  {
    title: 'أسعار عادلة من غير ضغط',
    body: 'أسعار البداية موجودة في هذه الصفحة. نشرح لك الخيارات والقرار لك، ولا نفرض عليك أي إضافات.',
    quote: 'لم يحاولوا أن يبيعوني أي إضافات لا داعي لها.',
    author: 'Ameena Shajahan',
  },
];

const photoCopy: Record<string, { alt: string; caption: string }> = {
  '/review-images/leno_thomas_2': {
    alt: 'تويوتا FJ كروزر رمادية بطلاء سيراميك جديد، من الأمام داخل استوديو WRP',
    caption: 'سيارة FJ كروزر الخاصة بـ Leno Thomas بعد طلاء السيراميك.',
  },
  '/review-images/nasar_ck_1': {
    alt: 'كاديلاك إسكاليد سوداء تحت إضاءة استوديو WRP',
    caption: 'كاديلاك إسكاليد الخاصة بـ Nasar CK.',
  },
  '/review-images/sujith_prasad_1': {
    alt: 'سوبارو WRX STI زرقاء أمام جدار شعار WRP',
    caption: 'سوبارو WRX STI الخاصة بـ Sujith Prasad.',
  },
  '/review-images/ritha_farzana_1': {
    alt: 'سيارة نيسان حمراء في استوديو WRP',
    caption: 'سيارة نيسان الخاصة بـ Ritha Farzana.',
  },
};
export const whyPhotosAr = whyPhotos.map((p) => {
  const copy = photoCopy[p.base];
  if (!copy) throw new Error(`studio: missing Arabic copy for the photo ${p.base}`);
  return { ...p, ...copy };
});

export const statsAr = [
  { value: rating, label: 'تقييم Google' },
  { value: reviewCount, label: 'مراجعة على Google' },
  { value: `${num(10)} سنوات`, label: 'أطول ضمان لفيلم PPF' },
  { value: `${num(6)} أيام`, label: 'من السبت إلى الخميس' },
];

export const aboutChecklistAr = [
  'تركيب معتمد لأفلام STEK ذاتية الإصلاح لحماية الطلاء، إلى جانب Avery Dennison',
  'ضمان من الشركة المصنّعة وعلى التركيب يصل إلى ١٠ سنوات',
  'طلاءات سيراميك 9H متعددة الطبقات بضمان من سنتين إلى ٧ سنوات',
  'غسيل يدوي آمن بمياه مفلترة منزوعة الأيونات',
];

export const loungeListAr = ['بلياردو', 'ألعاب لوحية', 'قهوة وكرك', 'شاشة كبيرة', 'مكيّفة', 'جدار زجاجي يطل على الورش'];

export const loungePhotoAr = {
  ...lounge.photos[0],
  alt: 'صالة WRP مع طاولة بلياردو وشاشة كبيرة وكنبة زرقاء',
  caption: 'بلياردو وشاشة كبيرة وكنبة. الصورة من العميل Venkat K.',
};
/** Translated from lounge.quotes[0]. */
export const loungeQuoteAr = { text: 'شعرت أنه ليس مجرد كراج عادي، بل أقرب إلى صالة راقية.', author: lounge.quotes[0].author };

const workCopy: Record<string, { title: string; what: string }> = {
  'Porsche Boxster Spyder': { title: 'بورشه بوكستر سبايدر', what: 'حماية طلاء كاملة' },
  'Porsche 911': { title: 'بورشه 911', what: 'طلاء سيراميك وعناية شاملة' },
  'Lotus Exige': { title: 'لوتس إكسيج', what: 'تصحيح طلاء وسيراميك' },
  'Subaru WRX STI': { title: 'سوبارو WRX STI', what: 'غسيل وحماية طلاء' },
  'Lexus LX 570': { title: 'لكزس LX 570', what: 'باقة عناية شاملة' },
  'Toyota Supra & Lotus': { title: 'تويوتا سوبرا ولوتس', what: 'عناية بمستوى صالات العرض' },
};
export const workAr = work.map((w) => {
  const copy = workCopy[w.title];
  if (!copy) throw new Error(`studio: missing Arabic copy for the ${w.title} project`);
  return { ...w, ...copy };
});
