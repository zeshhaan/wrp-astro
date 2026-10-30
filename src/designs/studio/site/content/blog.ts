// Copy of the live blog index (src/pages/blog/index.astro and its Arabic twin),
// word for word, for the Studio version. Taken from the live source on
// 2026-10-26. A string starting with @t: is a translations.ts key. The posts
// come from the blog content collection.
import type { BlogIndexCopy } from '../BlogIndexPage.astro';

export const blog: Record<'en' | 'ar', BlogIndexCopy> = {
  en: {
    title: 'Blog | WRP Detailing Studio - Car Care Insights & Guides',
    description: "Expert guides on ceramic coating, paint protection film, and car care in Dubai. Tips from WRP's detailing professionals.",
    crumbs: ['@t:common.home', '@t:blog.title'],
    h1: 'Blog',
    lede: "Expert insights on paint protection, ceramic coating, and automotive care - tailored for Dubai's climate.",
    featured: 'Featured',
    minRead: 'min read',
    min: 'min',
    categoryLabels: { guide: 'Guide', news: 'News', update: 'Update', event: 'Event', listicle: 'Listicle' },
    filterLabels: { all: 'All', guide: 'Guides', listicle: 'Listicles', news: 'News' },
    empty: {
      h3: 'No posts yet',
      text: "We're working on content for this category. Check back soon or explore our other articles.",
      button: 'View all posts',
      none: 'No posts yet. Check back soon.',
    },
    cta: {
      h2: 'Stay Informed',
      text: "Have questions about protecting your vehicle? Our team is ready to help you choose the right service for your car and Dubai's demanding climate.",
      button: 'GET IN TOUCH',
    },
    schema: {
      name: 'WRP Detailing Solutions Blog',
      description: 'Expert guides on ceramic coating, paint protection film, and car care in Dubai.',
      inLanguage: 'en',
      siteName: 'WRP Detailing Solutions',
    },
  },
  ar: {
    title: 'المدونة | WRP Detailing Studio - أدلة ونصائح العناية بالسيارات',
    description: 'مقالات عربية متخصصة عن طلاء السيراميك وفيلم حماية الطلاء والعناية بالسيارات في دبي من خبراء WRP.',
    crumbs: ['@t:common.home', '@t:blog.title'],
    h1: 'المدونة',
    lede: 'مقالات وأدلة عملية حول حماية الطلاء، طلاء السيراميك، والعناية بالسيارات بما يناسب أجواء دبي.',
    featured: '@t:blog.featured',
    minRead: '@t:blog.minRead',
    min: 'د',
    categoryLabels: { guide: 'دليل', news: 'أخبار', update: 'تحديث', event: 'فعالية', listicle: 'قائمة' },
    filterLabels: { all: 'الكل', guide: 'أدلة', listicle: 'قوائم', news: 'أخبار' },
    empty: {
      h3: 'لا توجد مقالات بعد',
      text: 'نعمل حالياً على إضافة محتوى لهذه الفئة. يمكنك العودة لاحقاً أو استعراض بقية المقالات.',
      button: 'عرض جميع المقالات',
      none: 'لا توجد مقالات منشورة حالياً. عد لاحقاً.',
    },
    cta: {
      h2: 'ابقَ على اطلاع',
      text: 'إذا كانت لديك أسئلة حول حماية سيارتك أو اختيار الخدمة المناسبة لظروف دبي، ففريقنا جاهز لمساعدتك.',
      button: 'تواصل معنا',
    },
    schema: {
      name: 'مدونة WRP Detailing Studio',
      description: 'أدلة ونصائح خبراء حول طلاء السيراميك وفيلم حماية الطلاء والعناية بالسيارات في دبي.',
      inLanguage: 'ar-AE',
      siteName: 'WRP Detailing Studio',
    },
  },
};
