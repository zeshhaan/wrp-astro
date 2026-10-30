import type { APIRoute } from 'astro';

/**
 * The Studio previews that used to live here (/design-lab/studio/wrap/,
 * /design-lab/studio/ar/services/polish/, …) are the live pages now, so old
 * review links land on the page they previewed. The header candidates and the
 * car viewer still render here (their routes are more specific).
 */
export const prerender = false;

export const GET: APIRoute = ({ params, url, redirect }) => {
  const page = params.page ?? '';
  const live = page === 'quote/one-page' ? '/quote/' : page ? `/${page}/` : '/';
  return redirect(`${live}${url.search}`, 301);
};
