// Copy of the live portfolio page (src/pages/portfolio/index.astro and its
// Arabic twin), word for word, for the Studio version. Taken from the live
// source on 2026-10-26. A string starting with @t: is a translations.ts key.
// The projects themselves come from the portfolio content collection.
import type { PortfolioCopy } from '../PortfolioPage.astro';

export const portfolio: Record<'en' | 'ar', PortfolioCopy> = {
  en: {
    title: 'Portfolio | WRP Detailing Studio - Our Work',
    description: 'Explore our portfolio of premium car detailing, ceramic coating, and paint protection projects in Dubai',
    crumbs: ['@t:common.home', '@t:portfolio.title'],
    h1: 'Our Work',
    lede: "Dubai's finest automotive transformations. Each project represents our commitment to perfection.",
    cta: {
      h2: 'Ready to Transform Your Vehicle?',
      text: 'Join our portfolio of satisfied clients. Experience the WRP difference with our premium detailing services.',
      button: 'GET A QUOTE',
    },
  },
  ar: {
    title: 'أعمالنا | WRP Detailing Studio',
    description: 'استكشف مجموعة من مشاريع WRP Detailing Studio في تظليل النوافذ وطلاء السيراميك وفيلم حماية الطلاء والتفصيل الفاخر للسيارات.',
    crumbs: ['@t:common.home', '@t:portfolio.title'],
    h1: 'أعمالنا',
    lede: 'نماذج من الأعمال التي نفذناها لسيارات مميزة في دبي. كل مشروع يعكس دقتنا في التنفيذ والتزامنا بالنتيجة النهائية.',
    cta: {
      h2: 'جاهز لتجربة النتيجة على سيارتك؟',
      text: 'انضم إلى عملائنا الذين اختاروا WRP للعناية الدقيقة بسياراتهم، ودعنا نضع الخطة المناسبة لسيارتك من أول زيارة.',
      button: '@t:home.hero.getQuote',
    },
  },
};
