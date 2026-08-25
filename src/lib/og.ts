/**
 * Open Graph card generator.
 *
 * Produces 1200x630 PNGs on demand so the dimensions we advertise in
 * `og:image:width/height` are actually true. The old setup pointed at
 * `/og-image.jpg` (1184x864) while claiming 1200x630, which is both under
 * Google Discover's 1200px floor and the wrong shape.
 *
 * Layout: the photo runs full bleed, a bottom-weighted scrim darkens the lower
 * third, and the text sits left-aligned in that footer band. Keeping the type
 * out of the optical centre means the photo still reads as a photo, which
 * matters because Discover avoids recommending text-heavy thumbnails.
 *
 * Blog posts deliberately do NOT use this. Their hero is already a clean 16:9
 * photograph and Discover prefers it untouched, so `BaseLayout` passes the hero
 * straight through and only non-article pages get a card.
 *
 * RENDERED AT BUILD TIME, not per request. The first cut ran these as SSR
 * routes on the Worker, which worked locally but returned `error code: 1101`
 * (uncaught exception) on real edge infrastructure after the first hit. The
 * card had to fetch its own photograph over HTTP, and with
 * `global_fetch_strictly_public` set that is a self-referential subrequest back
 * through the same Worker, on top of WASM rasterisation inside a 128MB isolate.
 *
 * There are seven cards in total and all of them come from static content, so
 * rendering on demand bought nothing. Prerendering removes the subrequest, the
 * per-request CPU, and that entire class of runtime failure. It also sidesteps
 * `trailingSlash: 'always'`, because a prerendered card is a plain file in
 * `dist/` rather than a route to be matched.
 *
 * No custom font is loaded. @cf-wasm/og ships a default sans that renders
 * predictably; pulling a woff2 over the wire would add a failure mode for no
 * visual gain at this size.
 *
 * ARABIC IS NOT RENDERED. The underlying shaper throws
 * `lookupType: 5 - substFormat: 3 is not yet supported` on Arabic text: the
 * script needs contextual substitution that Satori does not implement, and no
 * choice of font fixes it. Arabic pages therefore point at the English card
 * rather than a broken one. Service names here are largely Latin anyway
 * ("Paint Protection Film"), so the card still communicates.
 */
// Node entrypoint, not workerd: these cards are prerendered during `astro build`,
// which runs in Node. See the note on rendering at build time below.
import { ImageResponse } from '@cf-wasm/og/node';
import { createElement, type ReactElement, type ReactNode } from 'react';

const WIDTH = 1200;
const HEIGHT = 630;

// Monochrome, matching the site. INK is the near-black used for text and the
// scrim; PAPER is the off-white the wordmark and title sit in.
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const MUTED = 'rgba(255,255,255,0.72)';

export interface OgCardOptions {
  /** Small uppercase line above the title, e.g. a service category. */
  eyebrow?: string;
  title: string;
  /** One supporting line. Trimmed hard: the footer band is not a paragraph. */
  subtitle?: string;
  /** Background photograph as a data URI, read from disk at build time. */
  imageUrl?: string;
  /** Right-hand detail in the footer, e.g. "From AED 399". */
  badge?: string;
}

function el(type: string, props: Record<string, unknown>, children?: ReactNode): ReactElement {
  return createElement(type, props, children);
}

function truncate(value: string, limit: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > limit * 0.6 ? lastSpace : limit - 1)}…`;
}

/** Long titles step down a size rather than wrapping into the photo. */
function titleSize(title: string): number {
  if (title.length > 72) return 44;
  if (title.length > 44) return 52;
  return 62;
}

function wordmark(): ReactElement {
  return el('div', {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      color: PAPER,
      fontSize: 30,
      fontWeight: 900,
      letterSpacing: -0.5,
      fontStyle: 'italic',
    },
  }, [
    el('div', { style: { display: 'flex' } }, 'WRP.'),
    el('div', {
      style: {
        display: 'flex',
        marginLeft: 14,
        fontSize: 12,
        fontStyle: 'normal',
        fontWeight: 700,
        letterSpacing: 3.4,
        color: MUTED,
      },
    }, 'WRAP · REINFORCE · PROTECT'),
  ]);
}

function tree(options: OgCardOptions, withImage: boolean): ReactElement {
  const title = truncate(options.title, 96);
  const children: ReactNode[] = [];

  if (withImage && options.imageUrl) {
    children.push(el('img', {
      src: options.imageUrl,
      width: WIDTH,
      height: HEIGHT,
      style: {
        position: 'absolute', left: 0, top: 0,
        width: WIDTH, height: HEIGHT,
        objectFit: 'cover',
      },
    }));
  }

  // Bottom-weighted scrim. Two stops rather than a full-canvas wash so the top
  // two thirds of the photograph stay genuinely legible.
  children.push(el('div', {
    style: {
      position: 'absolute', left: 0, top: 0,
      width: WIDTH, height: HEIGHT,
      display: 'flex',
      // Ramps hard from ~30% down. The footer block grows upward as copy gets
      // longer, so a scrim that only darkens the last fifth leaves the wordmark
      // stranded over bright sky. Four stops keep the top of the frame clean
      // while guaranteeing contrast anywhere the type can reach.
      backgroundImage: `linear-gradient(to bottom, rgba(10,10,10,0.10) 0%, rgba(10,10,10,0.38) 30%, rgba(10,10,10,0.70) 56%, rgba(10,10,10,0.94) 100%)`,
    },
  }));

  // Footer band, left aligned.
  const footer: ReactNode[] = [wordmark()];

  if (options.eyebrow) {
    footer.push(el('div', {
      style: {
        display: 'flex',
        marginTop: 30,
        color: MUTED,
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 3.2,
        textTransform: 'uppercase',
      },
    }, truncate(options.eyebrow, 42)));
  }

  footer.push(el('div', {
    style: {
      display: 'flex',
      marginTop: options.eyebrow ? 14 : 26,
      color: PAPER,
      fontSize: titleSize(title),
      fontWeight: 800,
      lineHeight: 1.06,
      letterSpacing: -1.4,
      maxWidth: 900,
    },
  }, title));

  if (options.subtitle) {
    footer.push(el('div', {
      style: {
        display: 'flex',
        marginTop: 16,
        color: MUTED,
        fontSize: 22,
        lineHeight: 1.3,
        maxWidth: 860,
      },
    }, truncate(options.subtitle, 110)));
  }

  children.push(el('div', {
    style: {
      position: 'absolute',
      left: 64,
      right: 64,
      bottom: 54,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  }, footer));

  if (options.badge) {
    children.push(el('div', {
      style: {
        position: 'absolute',
        right: 64,
        top: 54,
        display: 'flex',
        padding: '10px 20px',
        background: PAPER,
        color: INK,
        fontSize: 17,
        fontWeight: 800,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
      },
    }, truncate(options.badge, 28)));
  }

  return el('div', {
    style: {
      display: 'flex',
      position: 'relative',
      width: WIDTH,
      height: HEIGHT,
      overflow: 'hidden',
      background: INK,
      fontFamily: 'sans-serif',
    },
  }, children);
}

function render(options: OgCardOptions, withImage: boolean): Promise<Response> {
  return ImageResponse.async(tree(options, withImage), {
    width: WIDTH,
    height: HEIGHT,
    format: 'png',
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}

/**
 * Render a card. If the background photo cannot be fetched or decoded, fall
 * back to the same layout on flat ink rather than returning an error: a plain
 * branded card still shares correctly, a 500 leaves scrapers with nothing.
 */
export async function createOgCard(options: OgCardOptions): Promise<Response> {
  const attempts: Array<[string, OgCardOptions, boolean]> = [
    ['photo', options, Boolean(options.imageUrl)],
    // Photo fetch/decode failure: same copy on flat ink.
    ['flat', options, false],
    // Text shaping failure: the two attempts above both carry the copy, so a
    // bad glyph takes out both. Drop to wordmark-only rather than return a 500
    // and leave the scraper with no image at all.
    ['wordmark', { title: '', imageUrl: options.imageUrl }, Boolean(options.imageUrl)],
  ];

  let lastError: unknown;
  for (const [label, opts, withImage] of attempts) {
    try {
      return await render(opts, withImage);
    } catch (error) {
      lastError = error;
      console.error(`[og] ${label} render failed:`, error);
    }
  }
  throw lastError;
}
