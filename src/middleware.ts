import { defineMiddleware } from 'astro:middleware';
import {
  AGENT_DISCOVERY_LINK_HEADER,
  SECURITY_HEADERS_ALL,
  SECURITY_HEADERS_HTML,
} from './consts';

/**
 * Middleware for i18n cookie management and response headers.
 * - Reads the `wrp-lang` cookie to track language preference.
 * - Sets the cookie when a user visits an Arabic page (so they stay in Arabic on return).
 * - Does NOT redirect — language banner handles the suggestion.
 * - Applies the security and RFC 8288 `Link` headers that `public/_headers`
 *   cannot reach. Prerendered pages are served straight from the Cloudflare
 *   ASSETS binding and get theirs from that file; SSR routes are rendered by
 *   the Worker, never touch it, and would otherwise ship bare.
 */
export const onRequest = defineMiddleware(async ({ request, url, locals }, next) => {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const langCookie = cookies['wrp-lang'];

  // If visiting an Arabic page, set the language preference cookie
  const isArabicPage = url.pathname.startsWith('/ar/') || url.pathname === '/ar';

  const response = await next();

  const isHtml = response.headers.get('content-type')?.includes('text/html') ?? false;

  // `set`, not `append`: these are single-valued, so a repeated field would be
  // malformed rather than additive.
  for (const [name, value] of Object.entries(SECURITY_HEADERS_ALL)) {
    response.headers.set(name, value);
  }

  if (isHtml) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS_HTML)) {
      response.headers.set(name, value);
    }

    // Advertise the llms files to agents. `append` rather than `set` so any
    // Link header the platform already attached survives — RFC 8288 allows
    // repeated Link fields and defines them as combining.
    response.headers.append('Link', AGENT_DISCOVERY_LINK_HEADER);
  }

  // Set cookie if on Arabic page and no cookie set yet, or if cookie doesn't match
  if (isArabicPage && langCookie !== 'ar') {
    response.headers.append('Set-Cookie', 'wrp-lang=ar; Path=/; Max-Age=31536000; SameSite=Lax');
  } else if (!isArabicPage && langCookie === 'ar') {
    // User navigated back to English — update preference
    response.headers.append('Set-Cookie', 'wrp-lang=en; Path=/; Max-Age=31536000; SameSite=Lax');
  }

  return response;
});

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...valueParts] = pair.trim().split('=');
    if (key) cookies[key.trim()] = valueParts.join('=').trim();
  }
  return cookies;
}
