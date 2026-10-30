// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import robotsTxt from 'astro-robots-txt';
import { subsetFaces } from './src/assets/fonts/subsets.mjs';

/**
 * Faces for Astro's local provider (it takes no `kind`; FontPreload.astro reads it).
 * @param {Parameters<typeof subsetFaces>[0]} cssVariable
 * @returns {any} the provider's `variants`, never empty
 */
const localFaces = (cssVariable) => subsetFaces(cssVariable).map(({ kind, ...face }) => face);

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
      // Design Lab pages are review-only, and the quote configurator is
      // noindex (src/designs/studio/quote/one-page/QuoteOne.astro).
      filter: (page) => !page.includes('/design-lab/') && !/\/quote\/$/.test(page),
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
    // Inter, Oswald, Montserrat and the Arabic sans are self-hosted subsets of the same
    // upstream fonts Google Fonts served, cut down to what the site uses by
    // scripts/fonts/subset-fonts.py (rerun it by hand when content needs new characters).
    // Each weight has a core face (preloaded) and an extended face behind unicode-range.
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.local(),
      options: { variants: localFaces('--font-inter') },
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      provider: fontProviders.local(),
      options: { variants: localFaces('--font-montserrat') },
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
      // IBM Plex Sans Arabic, renamed: "Plex" is a Reserved Font Name under its OFL, and
      // a subset is a modified version.
      name: 'WRP Sans Arabic',
      cssVariable: '--font-ibm-plex-arabic',
      provider: fontProviders.local(),
      options: { variants: localFaces('--font-ibm-plex-arabic') },
      fallbacks: ['system-ui', 'sans-serif'],
    },
    // ── Studio redesign fonts (src/designs/studio). Loaded only by the Design
    // Lab pages that ask for them via <Font>, so production pages are unaffected.
    {
      name: 'Oswald',
      cssVariable: '--font-oswald',
      provider: fontProviders.local(),
      options: { variants: localFaces('--font-oswald') },
      fallbacks: ['Arial Narrow', 'sans-serif'],
    },
  ],
});
