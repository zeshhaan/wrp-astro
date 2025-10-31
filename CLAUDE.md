# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based website for WRP (Wrap, Reinforce, Protect), a premium car detailing studio in Dubai. The project was migrated from Next.js 16 to Astro 5 and is deployed on Cloudflare Pages with server-side rendering.

**Migration Source**: This project was migrated from `/src/ameen/v0-wrp-landing-page-4q/`

## Development Commands

```bash
# Start development server (localhost:4321)
bun dev

# Build for production
bun build

# Preview build locally with Wrangler
bun preview

# Deploy to Cloudflare Pages
bun deploy

# Generate Cloudflare types
bun cf-typegen

# Run Astro CLI commands
bun astro ...
```

## Architecture

### Tech Stack
- **Framework**: Astro 5 with SSR (server output mode)
- **Adapter**: Cloudflare with platformProxy enabled
- **React**: v19.2.0 (for interactive components via @astrojs/react)
- **Alpine.js**: v3.x (for lightweight client-side interactivity via @astrojs/alpinejs)
- **TypeScript**: Strict mode with strictNullChecks enabled
- **Styling**: Tailwind CSS v4 with @tailwindcss/vite
- **UI Components**: shadcn/ui components (Radix UI primitives in React)
- **Fonts**: Playfair Display (serif), Inter (sans), Montserrat (logo)
- **Analytics**: Partytown for Google Analytics
- **Package Manager**: bun
- **Deployment**: Cloudflare Pages + D1 Database

### Cloudflare Integration

**D1 Database**:
- Database name: `wrp-contact-forms`
- Binding: `DB`
- Used for storing contact form submissions
- Access via `locals.runtime.env.DB` in API routes

**Wrangler Configuration** (`wrangler.jsonc`):
- Compatibility date: 2025-10-29
- Compatibility flags: `nodejs_compat`, `global_fetch_strictly_public`
- Assets binding: `ASSETS` (serves static files from `./dist`)
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
- Includes Google Fonts (Playfair Display, Inter, Montserrat)
- Loads Alpine.js and Lucide icons from CDN
- Initializes Lucide icons on DOM load and Alpine initialization
- Uses `[x-cloak]` pattern for Alpine.js

**Key Integration Points**:
- Alpine.js for lightweight interactivity (mobile menus, toggles)
- React components for complex UI (accordions, cards from shadcn/ui)
- Lucide icons used throughout (loaded from CDN, initialized via script)

### Styling Conventions

- **Tailwind CSS v4**: Uses Vite plugin (`@tailwindcss/vite`)
- **Font Variables**: Applied via Google Fonts link
  - `font-serif`: Playfair Display
  - `font-sans`: Inter
  - Logo uses Montserrat italic 900
- **Responsive Design**: Mobile-first approach
- **Path Alias**: `@/*` maps to `./src/*` (configured in tsconfig.json)

### API Routes

**Contact Form** (`src/pages/api/contact.ts`):
- Method: POST
- Validates name, email, message (required)
- Email regex validation
- Saves to D1 database (`contact_submissions` table)
- Returns JSON response with success/error
- Access runtime via `locals.runtime.env.DB`

**Runtime Access**:
```typescript
const db = locals.runtime.env.DB;
```

### Key Design Principles

- **Luxury Aesthetic**: Serif headings (Playfair Display), high contrast, black & white imagery
- **Brand Identity**: "WRP." logo uses Montserrat 900 italic
- **Three Pillars**: Wrap, Reinforce, Protect (W-R-P)
- **Progressive Enhancement**: Alpine.js for basic interactivity, React for complex components
- **Server-First**: Astro's server output mode with Cloudflare adapter

## Deployment

- **Platform**: Cloudflare Pages
- **Build Command**: `bun build` (generates `./dist`)
- **Wrangler**: Used for local preview and deployment
- **Database**: D1 database for form submissions
- **Assets**: Served via Cloudflare's asset binding

## Content & Assets

- All images in `/public` directory
- Images follow naming pattern: `luxury-*-black-and-white-*.jpg`
- Contact info: +971 54 717 3000, wrpdetailing@gmail.com, @wrp_ae
- Location: Al Qusais Industrial Area 1, Dubai, UAE

## Migration Notes

**From Next.js to Astro**:
- Converted Next.js App Router pages to Astro pages
- Migrated from Next.js API routes to Astro API routes
- Replaced Next.js Image component with Astro's image service (Cloudflare)
- Converted "use client" components to Alpine.js where possible
- Kept complex UI components (shadcn/ui) as React islands
- Replaced Vercel deployment with Cloudflare Pages
- Added D1 database for form persistence

## Important Files

- `astro.config.mjs`: Astro configuration with Cloudflare adapter
- `wrangler.jsonc`: Cloudflare Workers/Pages configuration
- `src/content.config.ts`: Content collection schemas
- `src/env.d.ts`: Cloudflare runtime type definitions
- `worker-configuration.d.ts`: D1 database bindings (referenced in tsconfig)
