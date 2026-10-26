/**
 * Server-side check of a Cloudflare Turnstile token (Siteverify).
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Fails closed: a network error, a non-2xx answer, a body that is not JSON, the
 * wrong action or a hostname we do not serve all count as "not verified".
 * Tokens are single-use, so the caller's form must get a fresh one before a
 * retry (the widget is reset after every attempt).
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare's published test keys. The site key always passes without showing
 * anything and hands out a dummy token; only the matching test secret accepts
 * it. Used wherever the real widget is not set up (local dev, Worker previews).
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_SITEKEY = '1x00000000000000000000BB';
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

export type TurnstileCheck = {
  token: unknown;
  secret: string;
  /** The `action` the widget was rendered with; Siteverify must return the same. */
  action: string;
  /** Frontend hostnames this deployment serves. Not checked with the test secret, which reports example.com. */
  hostnames: ReadonlySet<string>;
  remoteip?: string;
  fetcher?: typeof fetch;
};

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export function parseHostnames(value: string | undefined, fallback: string[]): Set<string> {
  const list = (value ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list.length ? list : fallback);
}

export async function verifyTurnstile({
  token,
  secret,
  action,
  hostnames,
  remoteip,
  fetcher = fetch,
}: TurnstileCheck): Promise<TurnstileResult> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);

  let result: { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
  try {
    const res = await fetcher(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: `siteverify-${res.status}` };
    result = await res.json();
  } catch {
    return { ok: false, reason: 'siteverify-unreachable' };
  }

  if (result.success !== true) {
    return { ok: false, reason: (result['error-codes'] ?? []).join(',') || 'not-verified' };
  }
  if (secret === TURNSTILE_TEST_SECRET) return { ok: true };
  if (result.action !== action) return { ok: false, reason: 'wrong-action' };
  if (!result.hostname || !hostnames.has(result.hostname.toLowerCase())) {
    return { ok: false, reason: 'wrong-hostname' };
  }
  return { ok: true };
}
