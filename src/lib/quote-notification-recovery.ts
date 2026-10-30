import { parseLeadAttribution, serializeLeadAttribution } from './attribution';
import type { QuoteLead } from './quote-form-lead';

export const NOTIFICATION_MAX_ATTEMPTS = 8;
export const NOTIFICATION_LEASE_MS = 10 * 60_000;
const BATCH_SIZE = 20;
const ALERT_AFTER_MS = 30 * 60_000;

type StoredQuote = {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  reply_by: 'call' | 'whatsapp' | null;
  vehicle: string | null;
  service_interest: string | null;
  source_url: string | null;
  locale: 'en' | 'ar';
  attribution_json: string | null;
  created_at: string;
};

export type NotificationAlert = { leadId: number; attempts: number; status: string };
type RecoveryOptions = {
  db: D1Database;
  send: (lead: QuoteLead, leadId: number, submittedAt: Date) => Promise<void>;
  alert?: (leads: NotificationAlert[]) => Promise<void>;
  leadId?: number;
  now?: () => number;
};

/** Both statements run in one D1 transaction. Missing migration 0008 therefore
 * rolls back the lead insert instead of acknowledging an unqueued notification.
 * changes() limits enqueue to this batch's new insert; old duplicates are not
 * backfilled because their notification may have been sent before the outbox. */
export async function saveQuoteLeadWithNotification(db: D1Database, requestId: string, lead: QuoteLead): Promise<number> {
  const results = await db.batch([
    db.prepare(`INSERT INTO quote_form_leads
      (request_id, name, phone, email, notes, reply_by, vehicle, service_interest, source_url, locale, attribution_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (request_id) DO NOTHING`)
      .bind(requestId, lead.name, lead.phone, lead.email, lead.notes, lead.reply, lead.vehicle,
        lead.service, lead.page, lead.locale, serializeLeadAttribution(lead.attribution)),
    db.prepare(`INSERT INTO quote_notification_outbox (lead_id)
      SELECT id FROM quote_form_leads WHERE request_id = ? AND changes() = 1
      ON CONFLICT (lead_id) DO NOTHING`).bind(requestId),
  ]);
  const existing = !results[0].meta.changes
    ? await db.prepare('SELECT id FROM quote_form_leads WHERE request_id = ?').bind(requestId).first<{ id: number }>()
    : null;
  const id = Number(existing?.id ?? results[0].meta.last_row_id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('QuoteLeadIdUnavailable');
  return id;
}

export function notificationRetryDelay(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 60 * 60_000);
}

/** Durable at-least-once delivery. Leases prevent concurrent normal sends;
 * acceptance by email followed by a crash before D1 acknowledgement can repeat.
 * Error text/payloads are deliberately excluded from both storage and logs. */
export async function recoverQuoteNotifications({ db, send, alert, leadId, now = Date.now }: RecoveryOptions): Promise<void> {
  const startedAt = now();
  // A process can die during its final attempt: release it into the alertable state.
  await db.prepare(`UPDATE quote_notification_outbox SET status = 'exhausted', lease_token = NULL
    WHERE status = 'pending' AND attempts >= ? AND lease_until <= ?`)
    .bind(NOTIFICATION_MAX_ATTEMPTS, startedAt).run();
  const due = await db.prepare(`SELECT lead_id FROM quote_notification_outbox
    WHERE status = 'pending' AND next_attempt_at <= ? AND lease_until <= ?
      AND (? IS NULL OR lead_id = ?)
    ORDER BY next_attempt_at, lead_id LIMIT ?`)
    .bind(startedAt, startedAt, leadId ?? null, leadId ?? null, BATCH_SIZE)
    .all<{ lead_id: number }>();

  for (const job of due.results) {
    const token = crypto.randomUUID();
    const claimedAt = now();
    const claimed = await db.prepare(`UPDATE quote_notification_outbox
      SET lease_token = ?, lease_until = ?, attempts = attempts + 1
      WHERE lead_id = ? AND status = 'pending' AND attempts < ?
        AND next_attempt_at <= ? AND lease_until <= ? RETURNING attempts`)
      .bind(token, claimedAt + NOTIFICATION_LEASE_MS, job.lead_id, NOTIFICATION_MAX_ATTEMPTS, claimedAt, claimedAt)
      .first<{ attempts: number }>();
    if (!claimed) continue;

    try {
      const row = await db.prepare('SELECT * FROM quote_form_leads WHERE id = ?').bind(job.lead_id).first<StoredQuote>();
      if (!row) throw new Error('MissingLead');
      const submittedAt = new Date(`${row.created_at.replace(' ', 'T')}Z`);
      await send({
        name: row.name, phone: row.phone, email: row.email, notes: row.notes,
        reply: row.reply_by, vehicle: row.vehicle, service: row.service_interest,
        page: row.source_url, locale: row.locale,
        attribution: parseLeadAttribution(row.attribution_json),
      }, row.id, Number.isNaN(submittedAt.getTime()) ? new Date(now()) : submittedAt);
      await db.prepare(`UPDATE quote_notification_outbox SET status = 'sent', sent_at = ?,
        last_error = NULL, lease_token = NULL, lease_until = 0
        WHERE lead_id = ? AND lease_token = ?`)
        .bind(now(), job.lead_id, token).run();
    } catch {
      const exhausted = claimed.attempts >= NOTIFICATION_MAX_ATTEMPTS;
      await db.prepare(`UPDATE quote_notification_outbox SET status = ?, next_attempt_at = ?,
        last_error = 'delivery_failed', lease_token = NULL, lease_until = 0
        WHERE lead_id = ? AND lease_token = ?`)
        .bind(exhausted ? 'exhausted' : 'pending', now() + notificationRetryDelay(claimed.attempts), job.lead_id, token).run();
      console.error('Quote notification delivery needs recovery', {
        leadId: job.lead_id, attempts: claimed.attempts, exhausted,
      });
    }
  }

  if (!alert) return;
  const alertAt = now();
  const alertToken = crypto.randomUUID();
  const alerts = await db.prepare(`UPDATE quote_notification_outbox
    SET alert_lease_token = ?, alert_lease_until = ?
    WHERE lead_id IN (
      SELECT lead_id FROM quote_notification_outbox
      WHERE status <> 'sent' AND alerted_at IS NULL AND alert_lease_until <= ?
        AND (status = 'exhausted' OR created_at <= ?)
      ORDER BY created_at LIMIT ?
    ) RETURNING lead_id, attempts, status`)
    .bind(alertToken, alertAt + NOTIFICATION_LEASE_MS, alertAt, alertAt - ALERT_AFTER_MS, BATCH_SIZE)
    .all<{ lead_id: number; attempts: number; status: string }>();
  if (!alerts.results.length) return;
  // A structured log remains available even when the email service is down.
  console.error('Quote notification backlog needs attention', {
    leadIds: alerts.results.map((row) => row.lead_id), count: alerts.results.length,
  });
  try {
    await alert(alerts.results.map((row) => ({ leadId: row.lead_id, attempts: row.attempts, status: row.status })));
    await db.prepare(`UPDATE quote_notification_outbox SET alerted_at = ?, alert_lease_token = NULL,
      alert_lease_until = 0 WHERE alert_lease_token = ?`).bind(now(), alertToken).run();
  } catch {
    // Keep the lease as a cooldown; the next cron after expiry retries this alert.
    console.error('Quote notification backlog alert could not be sent', { count: alerts.results.length });
  }
}
