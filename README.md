# WRP Detailing - Official Website

Premium car detailing studio website for **WRP (Wrap, Reinforce, Protect)** based in Dubai, UAE.

This project was migrated from Next.js 16 to Astro 5 and is deployed on Cloudflare Workers with server-side rendering.

## 🚀 Tech Stack

- **Framework**: [Astro 5](https://astro.build) with SSR (server output mode)
- **Adapter**: Cloudflare with platformProxy enabled
- **React**: v19.2.0 (for interactive components)
- **Alpine.js**: v3.x (for lightweight client-side interactivity)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Fonts**: Playfair Display (serif), Inter (sans), Montserrat (logo)
- **Package Manager**: bun
- **Deployment**: Cloudflare Workers + D1 Database

## 📋 Prerequisites

- [Bun](https://bun.sh) installed
- Cloudflare account (for deployment)
- Wrangler CLI (installed via dev dependencies)

## 🧞 Commands

All commands are run from the root of the project:

```bash
# Install dependencies
bun install

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

## 🏗️ Project Structure

```
wrp-astro/
├── public/                     # Static assets (images, favicon)
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui React components
│   │   ├── Navigation.astro    # Main navigation
│   │   ├── WRPFooter.astro     # Footer component
│   │   └── BaseHead.astro      # SEO/meta tags
│   ├── content/
│   │   ├── blog/               # Blog posts (Markdown/MDX)
│   │   └── services/           # Service content (Markdown/MDX)
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Main layout with nav/footer
│   │   ├── BlogPost.astro      # Blog post layout
│   │   └── ServiceLayout.astro # Service page layout
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── api/
│   │   │   └── contact.ts      # Contact form API (POST)
│   │   ├── blog/
│   │   │   └── [...slug].astro # Dynamic blog routes
│   │   ├── services/
│   │   │   └── [slug].astro    # Dynamic service routes
│   │   ├── index.astro         # Homepage
│   │   ├── about.astro         # About page
│   │   ├── more-about-wrp.astro# Extended about page
│   │   ├── contact-us.astro    # Contact form page
│   │   └── rss.xml.js          # RSS feed
│   ├── consts.ts               # Site constants
│   ├── content.config.ts       # Content collection schemas
│   └── env.d.ts                # Cloudflare runtime types
├── astro.config.mjs            # Astro configuration
├── wrangler.jsonc              # Cloudflare Workers config
├── tailwind.config.mjs         # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

## 🗄️ Cloudflare Integration

### D1 Database

- **Database name**: `wrp-contact-forms`
- **Binding**: `DB`
- **Purpose**: Stores contact form submissions
- **Access**: `locals.runtime.env.DB` in API routes

### Wrangler Configuration

- Worker entry: `./dist/_worker.js/index.js`
- Compatibility date: 2025-10-29
- Custom domains: `wrpdetailing.ae`, `www.wrpdetailing.ae`
- Email service binding for contact form notifications
- Static assets served via `ASSETS` binding

## 📝 Content Collections

### Services Collection

Located in `src/content/services/`, each service includes:
- Title, subtitle, description, hero image, price
- Package details (name, price, duration, features)
- Benefits list
- Step-by-step process
- FAQs

### Blog Collection

Located in `src/content/blog/` (for reference/future use):
- Title, description, publication date
- Hero image support
- MDX support for rich content

## 🎨 Design System

- **Brand Colors**: Black & white luxury aesthetic
- **Typography**:
  - Headings: Playfair Display (serif)
  - Body: Inter (sans-serif)
  - Logo: Montserrat 900 italic
- **Responsive**: Mobile-first approach
- **UI Framework**: Tailwind CSS v4 with shadcn/ui components

## 🚢 Deployment

The site is deployed on Cloudflare Workers:

1. Build: `bun build`
2. Deploy: `bun deploy`
3. Preview: `bun preview`

**Live domains**:
- [wrpdetailing.ae](https://wrpdetailing.ae)
- [www.wrpdetailing.ae](https://www.wrpdetailing.ae)

## 🔄 Migration Notes

This project was migrated from Next.js to Astro:
- Converted App Router pages → Astro pages
- Migrated API routes → Astro API routes
- Replaced Next.js Image → Astro image service
- Converted "use client" components → Alpine.js (where possible)
- Kept complex UI (shadcn/ui) as React islands
- Replaced Vercel → Cloudflare Workers
- Added D1 database for form persistence

## 📞 Contact Information

- **Phone**: +971 54 717 3000
- **Email**: info@wrpdetailing.ae
- **Instagram**: @wrp_ae
- **Location**: Al Qusais Industrial Area 1, Dubai, UAE

## 📄 License

© 2025 WRP Detailing. All rights reserved.

## 🛠️ Development

For detailed development instructions and architecture notes, see [CLAUDE.md](./CLAUDE.md).
