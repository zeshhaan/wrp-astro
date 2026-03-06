// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import robotsTxt from 'astro-robots-txt';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://wrpdetailing.ae',
  output: 'server',
  trailingSlash: 'always',
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
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag'],
      },
    }),
    alpinejs(),
    react(),
    robotsTxt({
      sitemap: [
        'https://wrpdetailing.ae/sitemap-index.xml',
      ],
    }),
    icon(),
  ],
  adapter: cloudflare({
    imageService: 'cloudflare',
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
  ],
});
