import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  leadOutcomeSigningSecretIsValid,
  recordLeadOutcome,
  verifyLeadOutcomeToken,
  type LeadOutcome,
  type LeadOutcomeAction,
  type RecordLeadOutcomeResult,
} from '@/lib/lead-outcome';

export const prerender = false;

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

export const GET: APIRoute = async ({ request, url }) => {
  const verification = await verifyRequest(url.searchParams.get('token'));
  if (!verification.ok) return page('Link unavailable', verification.message, verification.status);

  return page(
    `Confirm ${label(verification.action.outcome)}`,
    `Record this lead as ${label(verification.action.outcome).toLowerCase()}?`,
    200,
    confirmationForm(verification.token, verification.action.outcome, request.url),
  );
};

export const POST: APIRoute = async ({ request }) => {
  const expectedOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get('Origin');
  if (suppliedOrigin && suppliedOrigin !== expectedOrigin) {
    return page('Request rejected', 'Please open the action link from the original WRP email.', 403);
  }

  let token: string | null = null;
  try {
    token = (await request.formData()).get('token')?.toString() ?? null;
  } catch {
    return page('Request rejected', 'The submitted action was not valid.', 400);
  }

  const verification = await verifyRequest(token);
  if (!verification.ok) return page('Link unavailable', verification.message, verification.status);

  try {
    const result = await recordLeadOutcome(env.DB, verification.action);
    return outcomePage(result);
  } catch (error) {
    console.error('Failed to record lead outcome:', error);
    return page('Could not save outcome', 'Nothing was changed. Please try the original link again.', 500);
  }
};

async function verifyRequest(token: string | null): Promise<
  | { ok: true; token: string; action: LeadOutcomeAction }
  | { ok: false; status: number; message: string }
> {
  const secret = env.LEAD_OUTCOME_SIGNING_SECRET;
  if (!leadOutcomeSigningSecretIsValid(secret)) {
    console.error('LEAD_OUTCOME_SIGNING_SECRET is missing or too short; rejecting lead outcome action');
    return { ok: false, status: 503, message: 'Lead outcome actions are temporarily unavailable.' };
  }
  if (!token) return { ok: false, status: 400, message: 'This action link is incomplete.' };

  const action = await verifyLeadOutcomeToken(token, secret);
  if (!action) return { ok: false, status: 410, message: 'This action link is invalid or has expired.' };
  return { ok: true, token, action };
}

function confirmationForm(token: string, outcome: LeadOutcome, requestUrl: string): string {
  const action = new URL('/internal/lead-outcome/', requestUrl).toString();
  const colour = outcome === 'booked' ? '#176b3a' : '#7a2630';
  return `
    <form method="post" action="${escapeHtml(action)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit" style="border: 0; border-radius: 4px; padding: 12px 22px; background: ${colour}; color: #fff; font: inherit; font-weight: 700; cursor: pointer;">
        Confirm ${label(outcome)}
      </button>
    </form>`;
}

function outcomePage(result: RecordLeadOutcomeResult): Response {
  if (result.state === 'not-found') {
    return page('Lead not found', 'No lead matched this action link. Nothing was changed.', 404);
  }

  const recorded = result.state === 'recorded';
  return page(
    recorded ? `${label(result.outcome)} recorded` : 'Outcome already recorded',
    recorded
      ? `This lead is now marked ${label(result.outcome).toLowerCase()}.`
      : `This lead was already marked ${label(result.outcome).toLowerCase()}. The original outcome was not changed.`,
    200,
  );
}

function page(title: string, message: string, status: number, action = ''): Response {
  return new Response(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(title)} | WRP</title>
        </head>
        <body style="margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f3f3; color: #171717; font-family: Arial, sans-serif;">
          <main style="width: min(420px, calc(100% - 40px)); box-sizing: border-box; padding: 30px; border: 1px solid #ddd; background: #fff; text-align: center;">
            <div style="margin-bottom: 20px; font-size: 28px; font-weight: 900; font-style: italic;">WRP.</div>
            <h1 style="margin: 0 0 10px; font-size: 24px;">${escapeHtml(title)}</h1>
            <p style="margin: 0 0 ${action ? '22px' : '0'}; color: #555; line-height: 1.5;">${escapeHtml(message)}</p>
            ${action}
          </main>
        </body>
      </html>`,
    { status, headers: RESPONSE_HEADERS },
  );
}

function label(outcome: LeadOutcome): string {
  return outcome === 'booked' ? 'Booked' : 'Lost';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
