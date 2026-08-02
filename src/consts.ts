// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'WRP Detailing Studio - Premium Car Detailing';
export const SITE_DESCRIPTION = 'Dubai\'s premium automotive detailing studio. Wrap, Reinforce, Protect.';

/**
 * RFC 8288 `Link` response header advertising machine-readable descriptions of
 * the site, so agents can find them without parsing HTML. `describedby` is the
 * IANA-registered relation for "this resource is described by that one"; both
 * llms files are bilingual, so the same value is correct on EN and AR routes.
 *
 * Prerendered pages get this from `public/_headers` (the Worker never runs for
 * them) — keep the two in sync. This const covers the SSR routes only.
 */
export const AGENT_DISCOVERY_LINK_HEADER =
  '</llms.txt>; rel="describedby"; type="text/plain", ' +
  '</llms-full.txt>; rel="describedby"; type="text/plain"';

/**
 * Security headers mirrored from `public/_headers`. That file only decorates
 * responses served by the Cloudflare ASSETS binding, so until the middleware
 * started applying these the SSR routes (both contact pages and the contact
 * API) were shipping with none of them. Keep the two lists in sync.
 *
 * Split by applicability rather than copied wholesale: `nosniff` matters on
 * every response, and arguably most on the JSON API, where MIME sniffing is
 * the actual risk. The other two only govern how a *document* is framed or
 * scanned, so applying them to an API response would be noise.
 */
export const SECURITY_HEADERS_ALL = {
  'X-Content-Type-Options': 'nosniff',
} as const;

export const SECURITY_HEADERS_HTML = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
} as const;

export const NAV_PAGES = [
  { name: 'Blog', href: '/blog/' },
  { name: 'Portfolio', href: '/portfolio/' },
  { name: 'Reviews', href: '/reviews/' },
  { name: 'About', href: '/more-about-wrp/' },
  { name: 'Contact', href: '/contact-us/' },
];
