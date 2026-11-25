/**
 * Cloudflare Turnstile, the free invisible bot check on the lead forms.
 *
 * Rollout is soft on purpose: a lead is never lost because the check could not
 * run. Only a token that Cloudflare actively rejects (forged, expired or
 * replayed) blocks a submission, and the visitor sees the normal "please try
 * again or WhatsApp us" message. A missing token (script blocked by an ad
 * blocker, old cached page, bot posting directly) or an outage is let through
 * and logged, so the logs show how much spam a stricter rule would stop before
 * we turn it on.
 *
 * Without TURNSTILE_SECRET_KEY (local dev, Worker Previews) nothing is checked.
 */

export const TURNSTILE_FIELD = 'cf-turnstile-response';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** pass: verified human. fail: Cloudflare rejected the token. missing: no token sent.
 * skipped: no secret configured. error: Siteverify unreachable or misconfigured. */
export type TurnstileVerdict = 'pass' | 'fail' | 'missing' | 'skipped' | 'error';

/** Error codes that mean the token itself is bad, rather than our setup. */
const TOKEN_REJECTED = new Set(['invalid-input-response', 'timeout-or-duplicate']);

export interface TurnstileCheck {
  verdict: TurnstileVerdict;
  codes: string[];
}

export async function checkTurnstile(options: {
  token: unknown;
  secret: string | undefined;
  ip?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<TurnstileCheck> {
  if (!options.secret) return { verdict: 'skipped', codes: [] };
  const token = typeof options.token === 'string' ? options.token.trim() : '';
  if (!token) return { verdict: 'missing', codes: [] };
  // Real tokens are well under this; anything longer is not worth a round trip.
  if (token.length > 2048) return { verdict: 'fail', codes: ['invalid-input-response'] };

  const body = new FormData();
  body.set('secret', options.secret);
  body.set('response', token);
  if (options.ip) body.set('remoteip', options.ip);

  try {
    const response = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(options.timeoutMs ?? 4000),
    });
    if (!response.ok) return { verdict: 'error', codes: [`http-${response.status}`] };
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: unknown };
    const codes = Array.isArray(result['error-codes']) ? result['error-codes'].map(String) : [];
    if (result.success === true) return { verdict: 'pass', codes };
    // A rejection caused by our own setup (bad secret, bad request) must not cost a lead.
    if (codes.length > 0 && codes.every((code) => TOKEN_REJECTED.has(code))) return { verdict: 'fail', codes };
    return { verdict: 'error', codes };
  } catch {
    return { verdict: 'error', codes: ['unreachable'] };
  }
}

/** Soft rollout: only an actively rejected token blocks a lead. */
export function turnstileBlocks(check: TurnstileCheck): boolean {
  return check.verdict === 'fail';
}
