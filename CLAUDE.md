# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based website for WRP (Wrap, Reinforce, Protect), a premium car detailing studio in Dubai. Deployed on Cloudflare Workers with server-side rendering.

## Development Commands

```bash
# Start development server (localhost:4321)
bun dev

# Build for production
bun build

# Preview build locally with Wrangler
bun preview

# Deploy to Cloudflare Workers
bun deploy

# Generate Cloudflare types
bun cf-typegen

# Run Astro CLI commands
bun astro ...
```

## Architecture

### Tech Stack
- **Framework**: Astro 6 with SSR (server output mode), Vite 7
- **Adapter**: Cloudflare (`@astrojs/cloudflare`)
- **React**: v19 (for interactive components via @astrojs/react)
- **Alpine.js**: v3.x (for lightweight client-side interactivity via @astrojs/alpinejs)
- **TypeScript**: Strict mode with strictNullChecks enabled
- **Styling**: Tailwind CSS v4 with @tailwindcss/vite
- **UI Components**: shadcn/ui components (Radix UI primitives in React)
- **Fonts**: Playfair Display (serif), Inter (sans), Montserrat (logo), Noto Naskh Arabic, IBM Plex Sans Arabic — via Astro built-in Fonts API
- **Analytics**: Partytown for Google Analytics
- **Package Manager**: bun
- **Deployment**: Cloudflare Workers + D1 Database

### Cloudflare Integration

**D1 Database**:
- Database name: `wrp-contact-forms`
- Binding: `DB`
- Used for storing contact form submissions
- Access via `import { env } from 'cloudflare:workers'` then `env.DB`

**Wrangler Configuration** (`wrangler.jsonc`):
- Worker entry point: `./dist/_worker.js/index.js`
- Compatibility date: 2025-10-29
- Compatibility flags: `nodejs_compat`, `global_fetch_strictly_public`
- Assets binding: `ASSETS` (serves static files from `./dist`)
- Custom domains: `wrpdetailing.ae`, `www.wrpdetailing.ae`
- Email service binding for contact form notifications
- Observability enabled

### Project Structure

```
src/
├── content/                    # Content collections
│   ├── blog/                   # Blog posts (Markdown/MDX)
│   └── services/               # Service content (Markdown/MDX)
├── content.config.ts           # Content collection schemas
├── layouts/
│   ├── BaseLayout.astro        # Main layout with nav/footer
│   ├── BlogPost.astro          # Blog post layout
│   └── ServiceLayout.astro     # Service page layout
├── pages/
│   ├── index.astro             # Homepage
│   ├── about.astro             # About page
│   ├── more-about-wrp.astro    # Extended about page
│   ├── contact-us.astro        # Contact form page
│   ├── rss.xml.js              # RSS feed
│   ├── api/
│   │   └── contact.ts          # Contact form API (POST)
│   ├── blog/
│   │   └── [...slug].astro     # Dynamic blog routes
│   └── services/
│       └── [slug].astro        # Dynamic service routes
├── components/
│   ├── ui/                     # shadcn/ui React components
│   │   ├── accordion.tsx
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── Navigation.astro        # Main navigation
│   ├── WRPFooter.astro         # Footer component
│   ├── BaseHead.astro          # SEO/meta tags
│   └── FormattedDate.astro     # Date formatting
├── lib/
│   └── utils.ts                # Utility functions (cn, etc.)
├── consts.ts                   # Site constants
└── env.d.ts                    # Cloudflare runtime types

public/                         # Static assets (images, favicon)
```

### Content Collections

**Blog Collection** (`src/content/blog/`):
- Schema: title, description, pubDate, updatedDate, heroImage
- Loader: glob pattern `**/*.{md,mdx}`
- Currently for reference/future use

**Services Collection** (`src/content/services/`):
- Schema fields:
  - title, subtitle, description, heroImage, price
  - packages[] (name, price, duration, features[])
  - benefits[]
  - process[] (step, title, description)
  - faqs[] (question, answer)
- Used to dynamically generate service pages

### Layout Patterns

**BaseLayout.astro**:
- Props: `title`, `description`, `showNav`, `showFooter`
- Fonts loaded via Astro's built-in Fonts API (configured in `astro.config.mjs`)
- Loads Alpine.js and Lucide icons from CDN
- Initializes Lucide icons on DOM load and Alpine initialization
- Uses `[x-cloak]` pattern for Alpine.js

**Key Integration Points**:
- Alpine.js for lightweight interactivity (mobile menus, toggles)
- React components for complex UI (accordions, cards from shadcn/ui)
- Lucide icons used throughout (loaded from CDN, initialized via script)

### Styling Conventions

- **Tailwind CSS v4**: Uses Vite plugin (`@tailwindcss/vite`)
- **Font Variables**: Applied via Astro Fonts API (`astro.config.mjs`)
  - `--font-playfair`: Playfair Display (serif headings)
  - `--font-inter`: Inter (body sans-serif)
  - `--font-montserrat`: Montserrat 900 italic (logo)
  - `--font-noto-naskh`: Noto Naskh Arabic (Arabic serif)
  - `--font-ibm-plex-arabic`: IBM Plex Sans Arabic (Arabic sans)
- **Responsive Design**: Mobile-first approach
- **Path Alias**: `@/*` maps to `./src/*` (configured in tsconfig.json)

### API Routes

**Contact Form** (`src/pages/api/contact.ts`):
- Method: POST
- Validates name, email, message (required)
- Email regex validation
- Saves to D1 database (`contact_submissions` table)
- Sends email notification via Cloudflare Email Workers
- Returns JSON response with success/error

**Cloudflare Runtime Access**:
```typescript
import { env } from 'cloudflare:workers';
const db = env.DB;
```

### Key Design Principles

- **Luxury Aesthetic**: Serif headings (Playfair Display), high contrast, black & white imagery
- **Brand Identity**: "WRP." logo uses Montserrat 900 italic
- **Three Pillars**: Wrap, Reinforce, Protect (W-R-P)
- **Progressive Enhancement**: Alpine.js for basic interactivity, React for complex components
- **Server-First**: Astro's server output mode with Cloudflare adapter

## Deployment

- **Platform**: Cloudflare Workers
- **Build Command**: `bun build` (generates `./dist`)
- **Deploy Command**: `bun deploy` (uses Wrangler)
- **Wrangler**: Used for local preview and deployment
- **Database**: D1 database for form submissions
- **Assets**: Served via Cloudflare's asset binding
- **Domains**: wrpdetailing.ae, www.wrpdetailing.ae

## Content & Assets

- All images in `/public` directory
- Images follow naming pattern: `luxury-*-black-and-white-*.jpg`
- Contact info: +971 54 717 3000, info@wrpdetailing.ae, @wrp_ae
- Location: Al Qusais Industrial Area 1, Dubai, UAE

## Important Files

- `astro.config.mjs`: Astro configuration with Cloudflare adapter
- `wrangler.jsonc`: Cloudflare Workers configuration
- `src/content.config.ts`: Content collection schemas
- `src/env.d.ts`: Cloudflare runtime type definitions
- `worker-configuration.d.ts`: D1 database bindings (referenced in tsconfig)
