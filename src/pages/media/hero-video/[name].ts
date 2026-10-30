/**
 * Hero video with byte-range support: /media/hero-video/<name>/ (e.g. hero-1080.av1/).
 * The trailing slash is the site's trailingSlash rule; Content-Type says it's MP4.
 *
 * Workers static assets answer a `Range` request with the whole file (200), and
 * Safari/iOS will not play an MP4 without `206 Partial Content`. So the page
 * requests the video here; this reads the file from the ASSETS binding
 * (public/video/hero/) and returns just the requested bytes.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const NAME = /^hero-[a-z0-9x]+\.(av1|h264)$/;
const CACHE = 'public, max-age=604800, stale-while-revalidate=2592000';

export const GET: APIRoute = async ({ params, request }) => {
  const name = params.name ?? '';
  if (!NAME.test(name)) return new Response('Not found', { status: 404 });

  const url = new URL(`/video/hero/${name}.mp4`, request.url);
  // In `astro dev` the ASSETS binding points at the last build; the dev server serves public/ itself.
  const res = import.meta.env.DEV ? await fetch(url) : await (env as { ASSETS: Fetcher }).ASSETS.fetch(url);
  if (!res.ok) return new Response('Not found', { status: 404 });

  const body = await res.arrayBuffer(); // ≤ 5 MB each
  const size = body.byteLength;
  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': CACHE,
    'X-Content-Type-Options': 'nosniff',
  });
  const etag = res.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') ?? '');
  if (!range || (!range[1] && !range[2])) {
    headers.set('Content-Length', String(size));
    return new Response(body, { status: 200, headers });
  }
  // bytes=a-b, bytes=a- or bytes=-n (last n bytes)
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
};
