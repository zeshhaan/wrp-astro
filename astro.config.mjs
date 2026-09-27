// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import robotsTxt from 'astro-robots-txt';

/**
 * Wrap every markdown <table> in a horizontally-scrollable container so wide
 * tables scroll within the content column instead of forcing the whole page
 * to overflow on small screens. Keeps the table's own styling untouched.
 * Self-contained hast walk (no unist-util-visit dependency).
 */
function rehypeWrapTables() {
  return (tree) => {
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child && child.type === 'element' && child.tagName === 'table') {
          node.children[i] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'] },
            children: [child],
          };
        } else {
          walk(child);
        }
      }
    };
    walk(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://wrpdetailing.ae',
  output: 'server',
  trailingSlash: 'always',
  markdown: {
    rehypePlugins: [rehypeWrapTables],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    routing: {
      prefixDefaultLocale: false,
      fallbackType: 'rewrite',
    },
    fallback: {
      ar: 'en',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx(),
    sitemap({
      // Design Lab concepts are review-only previews, never indexable pages.
      filter: (page) => !page.includes('/design-lab/'),
      customPages: [
        'https://wrpdetailing.ae/llms.txt',
        'https://wrpdetailing.ae/llms-full.txt',
      ],
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-AE',
          ar: 'ar-AE',
        },
      },
    }),
    alpinejs(),
    react(),
    robotsTxt({
      host: 'wrpdetailing.ae',
      sitemap: [
        'https://wrpdetailing.ae/sitemap-index.xml',
      ],
      policy: [
        { userAgent: '*', allow: '/' },
        { userAgent: 'Googlebot', allow: '/' },
        { userAgent: 'Bingbot', allow: '/' },
        { userAgent: 'OAI-SearchBot', allow: '/' },
        { userAgent: 'ChatGPT-User', allow: '/' },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'PerplexityBot', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
        { userAgent: 'anthropic-ai', allow: '/' },
        { userAgent: 'Google-Extended', allow: '/' },
      ],
    }),
  ],
  adapter: cloudflare({
    imageService: 'cloudflare-binding',
  }),
  fonts: [
    {
      name: 'Playfair Display',
      cssVariable: '--font-playfair',
      provider: fontProviders.google(),
      weights: [400, 700, 900],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      provider: fontProviders.google(),
      weights: [900],
      styles: ['italic'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Noto Naskh Arabic',
      cssVariable: '--font-noto-naskh',
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ['normal'],
      subsets: ['arabic'],
      fallbacks: ['serif'],
    },
    {
      name: 'IBM Plex Sans Arabic',
      cssVariable: '--font-ibm-plex-arabic',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['arabic'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    // ── Design Lab concept fonts (src/designs/*). Loaded only by the concept
    // pages that ask for them via <Font>, so production pages are unaffected.
    {
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      provider: fontProviders.google(),
      weights: [400, 600, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Geist',
      cssVariable: '--font-geist',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Syne',
      cssVariable: '--font-syne',
      provider: fontProviders.google(),
      weights: [500, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Instrument Serif',
      cssVariable: '--font-instrument-serif',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Barlow Condensed',
      cssVariable: '--font-barlow-condensed',
      provider: fontProviders.google(),
      weights: [500, 700, 800],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Arial Narrow', 'sans-serif'],
    },
    {
      name: 'Barlow',
      cssVariable: '--font-barlow',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
