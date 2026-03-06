import { defineMiddleware } from 'astro:middleware';

/**
 * Middleware for i18n cookie management.
 * - Reads the `wrp-lang` cookie to track language preference.
 * - Sets the cookie when a user visits an Arabic page (so they stay in Arabic on return).
 * - Does NOT redirect — language banner handles the suggestion.
 */
export const onRequest = defineMiddleware(async ({ request, url, locals }, next) => {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const langCookie = cookies['wrp-lang'];

  // If visiting an Arabic page, set the language preference cookie
  const isArabicPage = url.pathname.startsWith('/ar/') || url.pathname === '/ar';

  const response = await next();

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
