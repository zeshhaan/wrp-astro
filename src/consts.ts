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

export const NAV_PAGES = [
  { name: 'Blog', href: '/blog/' },
  { name: 'Portfolio', href: '/portfolio/' },
  { name: 'Reviews', href: '/reviews/' },
  { name: 'About', href: '/more-about-wrp/' },
  { name: 'Contact', href: '/contact-us/' },
];
