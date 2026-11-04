import { parseLeadAttribution, type LeadAttribution } from './attribution';
import { quoteLeadSubject, type QuoteLead } from './quote-form-lead';
import { logQuoteEvent } from './quote-notification-dispatch';

/**
 * Hands website leads to the lead CRM (zeshhaan/leads-crm) over the `CRM`
 * service binding, so they show up there within seconds.
 *
 * The website saves and emails every lead exactly as before; the CRM is an
 * extra copy. Each hand-over is tracked in `crm_handoffs` (migration 0009):
 * right after a form is sent, and again from the 5-minute cron for anything
 * that failed, so a CRM outage delays leads but never loses them. The CRM
 * ignores a lead it already has (same `external_id`), so a retry can't
 * duplicate one.
 */

/** The lead shape the CRM accepts (leads-crm src/lib/intake-schema.ts). */
export type CrmLead = {
  source: string;
  external_id: string;
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
  details?: { label: string; value: string }[];
  attribution?: LeadAttribution;
  received_at?: string;
};

export type CrmResult =
  | { ok: true; id: number; duplicate: boolean }
  | { ok: false; error: string; issues: { path: string; message: string }[] };

/** The `LeadIntake` entrypoint of the CRM Worker, as seen through the binding. */
export type CrmBinding = { addLead(lead: CrmLead): Promise<CrmResult> };

export type HandoffKind = 'quote' | 'contact';

export const HANDOFF_MAX_ATTEMPTS = 12;
export const HANDOFF_LEASE_MS = 5 * 60_000;
const BATCH_SIZE = 20;

/** 1, 2, 4 … minutes, capped at an hour: about 7 hours of tries in all. */
export function handoffRetryDelay(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 60 * 60_000);
}

const detail = (label: string, value: string | null | undefined) =>
  value && value.trim() ? [{ label, value: value.trim().slice(0, 500) }] : [];

/** D1's CURRENT_TIMESTAMP ("2026-11-04 13:40:00", UTC) as ISO 8601. */
export function d1TimeToIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value.replace(' ', 'T')}${/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? '' : 'Z'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** A quote form lead (hero, homepage and /quote/ forms) in the CRM's shape. */
export function quoteToCrmLead(
  lead: QuoteLead,
  ids: { externalId: string; websiteLeadId?: number; receivedAt?: string },
): CrmLead {
  const reply = lead.reply === 'call' ? 'Call back' : lead.reply === 'whatsapp' ? 'WhatsApp' : null;
  return {
    source: 'website',
    external_id: ids.externalId,
    name: lead.name ?? undefined,
    phone: lead.phone,
    email: lead.email ?? undefined,
    subject: quoteLeadSubject(lead).slice(0, 300),
    message: lead.notes ?? undefined,
    details: [
      ...detail('Service', lead.service),
      ...detail('Vehicle', lead.vehicle),
      ...detail('Reply by', reply),
      ...detail('Form', 'Quote form'),
      ...detail('Page', lead.page),
      ...detail('Language', lead.locale === 'ar' ? 'Arabic' : null),
      ...detail('Website lead', ids.websiteLeadId ? `Quote #${ids.websiteLeadId}` : null),
    ],
    attribution: lead.attribution ?? undefined,
    received_at: ids.receivedAt,
  };
}

export type ContactLead = {
  name: string;
  email: string;
  phone: string | null;
  vehicle: string | null;
  service: string | null;
  message: string;
  locale: 'en' | 'ar';
  attribution: LeadAttribution | null;
};

/** A contact page lead (/contact-us/) in the CRM's shape. */
export function contactToCrmLead(
  lead: ContactLead,
  ids: { externalId: string; websiteLeadId?: number; receivedAt?: string },
): CrmLead {
  const what = lead.service ?? 'Estimate request';
  return {
    source: 'website',
    external_id: ids.externalId,
    name: lead.name,
    phone: lead.phone ?? undefined,
    email: lead.email,
    subject: (lead.vehicle ? `${what} for ${lead.vehicle} from ${lead.name}` : `${what} from ${lead.name}`).slice(0, 300),
    message: lead.message.slice(0, 5000),
    details: [
      ...detail('Service', lead.service),
      ...detail('Vehicle', lead.vehicle),
      ...detail('Form', 'Contact page'),
      ...detail('Language', lead.locale === 'ar' ? 'Arabic' : null),
      ...detail('Website lead', ids.websiteLeadId ? `Contact #${ids.websiteLeadId}` : null),
    ],
    attribution: lead.attribution ?? undefined,
    received_at: ids.receivedAt,
  };
}

type QuoteRow = {
  id: number; request_id: string; name: string | null; phone: string; email: string | null; notes: string | null;
  reply_by: 'call' | 'whatsapp' | null; vehicle: string | null; service_interest: string | null;
  source_url: string | null; locale: string | null; attribution_json: string | null; created_at: string;
};
type ContactRow = {
  id: number; name: string; email: string; phone: string | null; vehicle: string | null;
  service_interest: string | null; message: string; attribution_json: string | null; created_at: string;
};

async function loadCrmLead(db: D1Database, kind: HandoffKind, id: number): Promise<CrmLead | null> {
  if (kind === 'quote') {
    const row = await db.prepare('SELECT * FROM quote_form_leads WHERE id = ?').bind(id).first<QuoteRow>();
    if (!row) return null;
    return quoteToCrmLead({
      name: row.name, phone: row.phone, email: row.email, notes: row.notes, reply: row.reply_by,
      vehicle: row.vehicle, service: row.service_interest, page: row.source_url,
      locale: row.locale === 'ar' ? 'ar' : 'en', attribution: parseLeadAttribution(row.attribution_json),
    }, { externalId: `quote:${row.request_id}`, websiteLeadId: row.id, receivedAt: d1TimeToIso(row.created_at) });
  }
  const row = await db.prepare('SELECT * FROM contact_submissions WHERE id = ?').bind(id).first<ContactRow>();
  if (!row) return null;
  return contactToCrmLead({
    name: row.name, email: row.email, phone: row.phone, vehicle: row.vehicle, service: row.service_interest,
    message: row.message, locale: 'en', attribution: parseLeadAttribution(row.attribution_json),
  }, { externalId: `contact:${row.id}`, websiteLeadId: row.id, receivedAt: d1TimeToIso(row.created_at) });
}

const TABLES: Record<HandoffKind, string> = { quote: 'quote_form_leads', contact: 'contact_submissions' };

type HandoffOptions = {
  db: D1Database;
  crm: CrmBinding;
  /** Only this lead (right after its form was sent). Omit to work the backlog. */
  only?: { kind: HandoffKind; id: number };
  now?: () => number;
};

/**
 * Sends due leads to the CRM. Leads without a `crm_handoffs` row are queued
 * first. A lease stops the form's own attempt and the cron from sending the
 * same lead at once; if both ever did, the CRM's external_id check absorbs it.
 * Only ids and counts are logged, never what a customer typed.
 */
export async function handOffLeads({ db, crm, only, now = Date.now }: HandoffOptions): Promise<void> {
  const kinds: HandoffKind[] = only ? [only.kind] : ['quote', 'contact'];
  await db.batch(kinds.map((kind) => db.prepare(
    `INSERT OR IGNORE INTO crm_handoffs (kind, lead_id)
     SELECT ?, l.id FROM ${TABLES[kind]} l
     WHERE (? IS NULL OR l.id = ?)
       AND NOT EXISTS (SELECT 1 FROM crm_handoffs h WHERE h.kind = ? AND h.lead_id = l.id)
     ORDER BY l.id LIMIT ?`,
  ).bind(kind, only?.id ?? null, only?.id ?? null, kind, BATCH_SIZE)));

  const startedAt = now();
  const due = await db.prepare(`SELECT kind, lead_id FROM crm_handoffs
    WHERE status = 'pending' AND next_attempt_at <= ? AND lease_until <= ?
      AND (? IS NULL OR (kind = ? AND lead_id = ?))
    ORDER BY next_attempt_at, created_at LIMIT ?`)
    .bind(startedAt, startedAt, only?.kind ?? null, only?.kind ?? null, only?.id ?? null, BATCH_SIZE)
    .all<{ kind: HandoffKind; lead_id: number }>();

  for (const job of due.results) {
    const token = crypto.randomUUID();
    const claimedAt = now();
    const claimed = await db.prepare(`UPDATE crm_handoffs
      SET lease_token = ?, lease_until = ?, attempts = attempts + 1
      WHERE kind = ? AND lead_id = ? AND status = 'pending' AND attempts < ?
        AND next_attempt_at <= ? AND lease_until <= ? RETURNING attempts`)
      .bind(token, claimedAt + HANDOFF_LEASE_MS, job.kind, job.lead_id, HANDOFF_MAX_ATTEMPTS, claimedAt, claimedAt)
      .first<{ attempts: number }>();
    if (!claimed) continue;

    const finish = (status: string, fields: { crmLeadId?: number; error?: string; retryAt?: number }) =>
      db.prepare(`UPDATE crm_handoffs SET status = ?, crm_lead_id = COALESCE(?, crm_lead_id), last_error = ?,
          sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END, next_attempt_at = COALESCE(?, next_attempt_at),
          lease_token = NULL, lease_until = 0
        WHERE kind = ? AND lead_id = ? AND lease_token = ?`)
        .bind(status, fields.crmLeadId ?? null, fields.error ?? null, status, now(), fields.retryAt ?? null,
          job.kind, job.lead_id, token).run();

    try {
      const lead = await loadCrmLead(db, job.kind, job.lead_id);
      if (!lead) {
        await finish('rejected', { error: 'missing_lead' });
        continue;
      }
      const result = await crm.addLead(lead);
      if (result.ok) {
        await finish('sent', { crmLeadId: result.id });
      } else {
        // The CRM refused the lead's contents; sending it again won't change that.
        await finish('rejected', { error: 'invalid_lead' });
        logQuoteEvent('error', 'crm_handoff_rejected', {
          kind: job.kind, leadId: job.lead_id, fields: result.issues.map((i) => i.path).join(','),
        });
      }
    } catch {
      const exhausted = claimed.attempts >= HANDOFF_MAX_ATTEMPTS;
      await finish(exhausted ? 'exhausted' : 'pending', {
        error: 'crm_unreachable', retryAt: now() + handoffRetryDelay(claimed.attempts),
      });
      logQuoteEvent('error', 'crm_handoff_failed', {
        kind: job.kind, leadId: job.lead_id, attempts: claimed.attempts, exhausted,
      });
    }
  }
}

/** The binding, when this deploy has one (see wrangler.jsonc). */
export function crmBinding(env: Cloudflare.Env): CrmBinding | null {
  const crm = (env as unknown as { CRM?: CrmBinding }).CRM;
  return crm && typeof crm.addLead === 'function' ? crm : null;
}
