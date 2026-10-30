import { formatAttributionTouch, type LeadAttribution } from './attribution';

/**
 * The website's own quote form (the Studio hero form). The pieces here are
 * plain functions so they can be tested; the Astro Action in src/actions wires
 * them to D1, the honeypot and Email Workers.
 */

/** Hostnames that serve the real site. Anywhere else, a lead is a dry run. */
export const LIVE_HOSTS = ['wrpdetailing.ae', 'www.wrpdetailing.ae'];

/** The field is hidden from visitors; a filled value indicates automated spam. */
export function isHoneypotFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Lab pages are reviewed in production too; their submissions are never real leads. */
const LAB_PREFIX = '/design-lab/';

export type QuoteLeadMode = 'live' | 'dry-run' | 'unavailable';

/**
 * Whether a submission can be stored ('live'), only checked ('dry-run'), or
 * must fail because the live database binding is missing ('unavailable').
 *
 * Only the production Worker on a live hostname, with its D1 binding,
 * from a page that is not in the Design Lab, writes a lead. Email is optional
 * and never decides whether a lead can be saved. Worker
 * previews (`ENVIRONMENT=preview`), the workers.dev hostname
 * and Lab pages all go through the same validation and honeypot check, then stop.
 * Local dev (`astro dev`, local D1) counts as live so the full path can be run.
 */
export function quoteLeadMode({
  hostname,
  page,
  environment,
  hasDatabase,
  dev = false,
}: {
  hostname: string;
  page: string;
  environment?: string;
  hasDatabase: boolean;
  dev?: boolean;
}): QuoteLeadMode {
  if (environment === 'preview') return 'dry-run';
  if (page.startsWith(LAB_PREFIX) || page.startsWith(`/ar${LAB_PREFIX}`)) return 'dry-run';
  if (!dev && !LIVE_HOSTS.includes(hostname)) return 'dry-run';
  return hasDatabase ? 'live' : 'unavailable';
}

/** A UAE or international number: at least 7 digits, only phone punctuation. */
export function isPhone(value: string): boolean {
  return /^[+0-9 ()\-]{7,40}$/.test(value) && value.replace(/\D/g, '').length >= 7;
}

/** Same address shape as the contact endpoint, bounded for storage and email. */
export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type QuoteReply = 'call' | 'whatsapp';

export type QuoteLead = {
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  /** How the visitor wants the answer, when the form asked (the phone layout). */
  reply: QuoteReply | null;
  vehicle: string | null;
  service: string | null;
  page: string | null;
  locale: 'en' | 'ar';
  attribution: LeadAttribution | null;
};

export function quoteLeadSubject({ name, phone, vehicle, service, reply }: QuoteLead): string {
  const what = service ?? 'quote';
  const who = name ?? phone;
  const ask = reply === 'call' ? 'Call back' : reply === 'whatsapp' ? 'WhatsApp' : 'Website quote';
  return vehicle ? `${ask}: ${what} for ${vehicle} from ${who}` : `${ask}: ${what} from ${who}`;
}

/** WhatsApp chat link for the number the visitor left, so the team can reply in one tap. */
export function whatsappReplyLink(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `971${digits.slice(1)}`;
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

/** The notification email, in the layout of the popup's. `outcomeActions` is ready-made HTML. */
export function quoteLeadEmailHtml(lead: QuoteLead, outcomeActions: string, sentAt: Date): string {
  const cell = 'border: 1px solid #e0e0e0; padding: 10px 12px; vertical-align: top;';
  const row = (label: string, value: string) =>
    `<tr><td style="${cell} width: 40%; background: #fafafa;"><strong>${escapeHtml(label)}</strong></td>` +
    `<td style="${cell}">${value}</td></tr>`;
  const phone = escapeHtml(lead.phone);
  const wa = whatsappReplyLink(lead.phone);

  return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">New Quote Request</h1>
              <p style="margin: 6px 0 0; font-size: 13px;">via the quote form on the website</p>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <table style="width: 100%; border-collapse: collapse; background: #fff;">
                ${row('Name', escapeHtml(lead.name ?? 'Not given'))}
                ${row('Phone', `<a href="tel:${phone}">${phone}</a>${wa ? ` · <a href="${wa}">WhatsApp</a>` : ''}`)}
                ${lead.email ? row('Email', `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`) : ''}
                ${lead.reply ? row('Reply by', lead.reply === 'call' ? '<strong>Call back</strong>' : '<strong>WhatsApp</strong>') : ''}
                ${row('Vehicle', escapeHtml(lead.vehicle ?? 'Not provided'))}
                ${row('Service', escapeHtml(lead.service ?? 'Not specified'))}
                ${lead.notes ? row('Notes', escapeHtml(lead.notes).replace(/\r?\n/g, '<br>')) : ''}
                ${row('Came from', escapeHtml(lead.page ?? 'Unknown'))}
                ${lead.locale === 'ar' ? row('Language', 'Arabic') : ''}
                ${lead.attribution ? row('First touch', escapeHtml(formatAttributionTouch(lead.attribution.first))) : ''}
                ${lead.attribution ? row('Latest source', escapeHtml(formatAttributionTouch(lead.attribution.last))) : ''}
              </table>
              ${outcomeActions}
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">
              Submitted on ${sentAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}
            </p>
          </div>
        </body>
      </html>
    `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
