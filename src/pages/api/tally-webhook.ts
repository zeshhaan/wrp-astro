import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext/browser';

/**
 * Receives submissions from the Tally "Get a Quote" popup and lands them in D1
 * alongside the website contact form, so there is one place to look for leads.
 *
 * Three things are load-bearing here:
 *
 *   1. Signature verification. This endpoint is public and writes to the
 *      database, so an unsigned request is not trusted. Tally signs the raw
 *      body with a secret you set on the webhook; we recompute and compare.
 *   2. Idempotency. Tally retries deliveries it considers failed. The insert
 *      relies on the UNIQUE constraint on tally_submission_id, and we only send
 *      the notification email when a row was actually written, so a retry
 *      cannot produce a duplicate lead or a duplicate email.
 *   3. We always store the raw payload. Tally identifies answers by field id,
 *      and question labels can be edited in the Tally editor, so the mapping
 *      below can silently stop matching. The raw body means no answer is ever
 *      lost, even when that happens.
 */

export const prerender = false;

/** Tally field labels → our D1 columns. Compared case- and space-insensitively. */
const LABEL_MAP: Record<string, string> = {
  'which car model do you need the service for': 'vehicle',
  'anything we should know': 'message',
  'what is your name': 'name',
  'best number to reach you on whatsapp works': 'phone',
  'email if youd rather we write': 'email',
  'source_url': 'source_url',
};

/** The opening question. Every respondent answers exactly this one. */
const CATEGORY_LABEL = 'what can we do for your car';

/**
 * The follow-ups that turn a category into an actual service. They share one
 * slot because the branching guarantees a respondent only ever reaches one of
 * them. Glass & Tint has no follow-up and falls back to the category.
 */
const SERVICE_LABELS = new Set([
  'which film or coating',
  'wrapping or chrome delete',
  'what needs fixing',
  'what kind of clean',
  'what are we doing with the interior',
]);

/**
 * Questions that qualify a service rather than name it. Several pages share a
 * label on purpose — "Which finish?" is asked for both PPF and wrap — which is
 * harmless here: a respondent walks one branch and Tally sends the rest null.
 */
const DETAIL_LABELS = new Set([
  'how much of the car',
  'which finish',
  'any colour in mind',
  'which windows',
  'how dark',
  'which package',
]);

/** Fallbacks used when a label has been edited and no longer matches above. */
const TYPE_MAP: Record<string, string> = {
  INPUT_EMAIL: 'email',
  INPUT_PHONE_NUMBER: 'phone',
  TEXTAREA: 'message',
};

const normalise = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, ' ').trim();

type TallyField = {
  key?: string;
  label?: string;
  type?: string;
  value?: unknown;
  options?: { id: string; text: string }[];
};

/**
 * Turns a Tally answer into a string. Choice questions send an array of option
 * ids rather than the text, so those get resolved against the field's options.
 */
function readAnswer(field: TallyField): string {
  const { value, options } = field;
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((v) => options?.find((o) => o.id === v)?.text ?? String(v))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Option text is written for the respondent: "Full Body: every painted panel,
 * roof and boot included". The part before the colon is the name the team
 * actually uses, and keeps service_interest readable in a list of leads.
 * Free-text answers have no colon and pass through untouched.
 */
function shorten(answer: string): string {
  if (/^not sure/i.test(answer)) return 'not sure';
  return answer.split(':')[0].trim();
}

/** Constant-time comparison, so a mismatch cannot be found byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureIsValid(rawBody: string, provided: string | null, secret: string) {
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  return safeEqual(expected, provided);
}

export const POST: APIRoute = async ({ request }) => {
  const secret = env.TALLY_SIGNING_SECRET;

  // Refuse rather than accept unverified writes. A missing secret is a
  // deployment mistake, not a reason to trust the request.
  if (!secret) {
    console.error('TALLY_SIGNING_SECRET is not set; rejecting webhook');
    return json({ success: false, error: 'Webhook not configured' }, 500);
  }

  const rawBody = await request.text();

  if (!(await signatureIsValid(rawBody, request.headers.get('tally-signature'), secret))) {
    console.warn('Rejected Tally webhook with bad signature');
    return json({ success: false, error: 'Invalid signature' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ success: false, error: 'Malformed JSON' }, 400);
  }

  const data = payload?.data ?? {};
  const submissionId: string | undefined = data.submissionId ?? data.responseId ?? payload?.eventId;

  if (!submissionId) {
    console.error('Tally webhook had no submission id', Object.keys(data));
    return json({ success: false, error: 'Missing submission id' }, 400);
  }

  // Collect answers by our column names.
  const answers: Record<string, string> = {};
  let category = '';
  let service = '';
  const details: string[] = [];

  /**
   * Every service question the respondent actually answered, with its original
   * wording and the full option text, in the order it was asked.
   *
   * This is deliberately separate from `details` above. The database column
   * wants one short scannable line; the notification email wants the whole
   * answer, because that is what the team quotes from. Shortening there would
   * throw away exactly the detail that decides the price.
   */
  const asked: { label: string; value: string }[] = [];

  for (const field of (data.fields ?? []) as TallyField[]) {
    const answer = readAnswer(field);
    if (!answer) continue;

    const label = normalise(field.label ?? '');

    if (label === CATEGORY_LABEL) {
      category = answer;
      asked.push({ label: field.label ?? '', value: answer });
    } else if (SERVICE_LABELS.has(label)) {
      service = answer;
      asked.push({ label: field.label ?? '', value: answer });
    } else if (DETAIL_LABELS.has(label)) {
      details.push(shorten(answer));
      asked.push({ label: field.label ?? '', value: answer });
    } else {
      const target = LABEL_MAP[label] ?? (field.type ? TYPE_MAP[field.type] : undefined);
      if (target) answers[target] = answer;
    }
  }

  // The follow-up names the actual service, so it wins over the broad category.
  // Details come after it in the order Tally sends them, which is the order they
  // were asked — so a lead reads "Paint Protection Film (PPF) · Full Body ·
  // Gloss" rather than just "Paint Protection & Coatings".
  const serviceInterest = [service || category, ...details].filter(Boolean).join(' · ') || null;

  try {
    const inserted = await env.DB.prepare(
      `INSERT INTO quote_requests
         (tally_submission_id, name, phone, email, vehicle, service_interest, message, source_url, raw_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tally_submission_id) DO NOTHING`,
    )
      .bind(
        submissionId,
        answers.name || null,
        answers.phone || null,
        answers.email || null,
        answers.vehicle || null,
        serviceInterest,
        answers.message || null,
        answers.source_url || null,
        rawBody,
      )
      .run();

    // No rows changed means we have seen this submission before: a retry.
    // Acknowledge it so Tally stops, but do not email again.
    if (!inserted.meta.changes) {
      return json({ success: true, duplicate: true }, 200);
    }
  } catch (dbError) {
    // A 500 tells Tally to retry, which is what we want for a transient D1
    // failure. The raw body is in the payload it will resend.
    console.error('Failed to store quote request:', dbError);
    return json({ success: false, error: 'Storage failed' }, 500);
  }

  // Email is best-effort. The lead is already safely in D1, so a mail failure
  // must not trigger a retry that would re-process the submission.
  try {
    await notify(answers, serviceInterest, asked);
  } catch (emailError) {
    console.error('Failed to send quote notification:', emailError);
  }

  return json({ success: true }, 200);
};

async function notify(
  answers: Record<string, string>,
  serviceInterest: string | null,
  asked: { label: string; value: string }[],
) {
  const name = answers.name || 'Someone';
  const vehicle = answers.vehicle || '';
  const subject = vehicle
    ? `Popup quote: ${serviceInterest ?? 'enquiry'} for ${vehicle} from ${name}`
    : `Popup quote: ${serviceInterest ?? 'enquiry'} from ${name}`;

  // Borders live on the cells rather than the table so they survive clients
  // that drop `border-collapse`.
  const cell = 'border: 1px solid #e0e0e0; padding: 10px 12px; vertical-align: top;';
  const row = (label: string, value: string) =>
    `<tr><td style="${cell} width: 40%; background: #fafafa;"><strong>${escapeHtml(label)}</strong></td>` +
    `<td style="${cell}">${value}</td></tr>`;

  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Quote Popup', addr: 'noreply@wrpdetailing.ae' });
  msg.setRecipient('wrp.detailing@gmail.com');
  msg.setSubject(subject);
  msg.addMessage({
    contentType: 'text/html',
    data: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">New Quote Request</h1>
              <p style="margin: 6px 0 0; font-size: 13px;">via the website popup</p>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <table style="width: 100%; border-collapse: collapse; background: #fff;">
                ${row('Name', escapeHtml(answers.name || 'Not provided'))}
                ${row(
                  'Phone',
                  answers.phone
                    ? `<a href="tel:${escapeHtml(answers.phone)}">${escapeHtml(answers.phone)}</a>`
                    : 'Not provided',
                )}
                ${
                  // The popup no longer asks for an email, so this row would
                  // otherwise read "Not provided" on every notification. Kept
                  // rather than deleted: the mapping still works if the question
                  // is ever added back.
                  answers.email
                    ? row(
                        'Email',
                        `<a href="mailto:${escapeHtml(answers.email)}">${escapeHtml(answers.email)}</a>`,
                      )
                    : ''
                }
                ${row('Vehicle', escapeHtml(answers.vehicle || 'Not provided'))}
                ${
                  // One row per question the respondent actually answered, in
                  // the order asked, with the full option text. Unanswered
                  // branches are absent rather than listed as empty, so the
                  // table stays as short as the enquiry actually was.
                  asked
                    .map(({ label, value }) => row(label, escapeHtml(value)))
                    .join('\n                ')
                }
                ${row('Came from', escapeHtml(answers.source_url || 'Unknown'))}
              </table>
              ${
                answers.message
                  ? `<div style="background: #fff; padding: 15px; margin-top: 15px; border-left: 4px solid #000;">
                       <strong>Notes:</strong><br><br>${escapeHtml(answers.message).replace(/\n/g, '<br>')}
                     </div>`
                  : ''
              }
            </div>
            <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
              Submitted ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}
            </div>
          </div>
        </body>
      </html>
    `,
  });

  await env.EMAIL.send(
    new EmailMessage('noreply@wrpdetailing.ae', 'wrp.detailing@gmail.com', msg.asRaw()),
  );
}

/** Answers are attacker-controllable and land in an HTML email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
