/**
 * Where Studio's inner pages live while they are being reviewed.
 *
 * Each Studio page renders at its live path under `labPrefix` (for example
 * /design-lab/studio/services/polish/ for /services/polish/). Pages listed in
 * `previewed` already have a Studio version, so links to them from a Studio
 * preview stay inside the preview; every other link goes to the live page.
 * When the redesign goes live this file is deleted and the links are the live
 * paths they already are.
 */
export const labPrefix = '/design-lab/studio';

/** The quote flow. Temporary until the redesign gives it a permanent URL. */
export const studioQuoteHref = `${labPrefix}/quote/`;

/** Live paths that have a Studio version under labPrefix (the Arabic /ar/ twin included unless noted). */
const previewed: RegExp[] = [/^\/$/, /^\/services\/[a-z-]+\/$/, /^\/(wrap|reinforce|protect)\/$/, /^\/more-about-wrp\/$/, /^\/contact-us\/$/, /^\/reviews\/$/, /^\/portfolio\/$/, /^\/blog\/([a-z0-9-]+\/)?$/, /^\/(privacy|terms|credits)\/$/];
/** Arabic pages whose Studio version is not built yet. */
const englishOnly: RegExp[] = [/^\/ar\/$/, /^\/ar\/credits\/$/];

/** The Studio preview of a live path, or the path itself if it has none yet. */
export function toLab(href: string): string {
  if (!href.startsWith('/') || href.startsWith(`${labPrefix}/`)) return href;
  const [path, hash = ''] = href.split('#');
  const arabic = path === '/ar/' || path.startsWith('/ar/');
  const base = arabic ? path.slice(3) : path;
  if (!previewed.some((re) => re.test(base))) return href;
  if (arabic && englishOnly.some((re) => re.test(path))) return href;
  return `${labPrefix}${path}${hash ? `#${hash}` : ''}`;
}
