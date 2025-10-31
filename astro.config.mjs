// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://wrp.ae',
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [mdx(), sitemap(), partytown({
    config: {
      forward: ['dataLayer.push', 'gtag'],
    },
  }), alpinejs(), react()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: 'cloudflare',
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/cloudflare',
    },
  },
});