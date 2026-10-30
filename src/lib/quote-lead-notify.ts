import { parseLeadAttribution } from './attribution';
import type { QuoteLead, QuoteReply } from './quote-form-lead';

/**
 * Getting a saved quote lead to the team's inbox. The lead is already safe in
 * D1 when these run; they only decide whether to try the email again.
 *
 * Each try is counted on the lead (`notify_attempts`, migration 0008) and a
 * delivered email stamps `notified_at`. The request tries twice, a resend of
 * a failed request tries again, and the Worker's Cron Trigger (src/worker.ts)
 * retries the rest. After the last try the lead goes to the agency address as
 * an alert, so a saved but unemailed lead is never silent.
 *
 * The email itself is passed in (src/lib/quote-lead-email.ts sends it), so
 * these functions run under Bun's tests without the Workers runtime.
 */

/** Tries in all: two with the request, the rest from the scheduled retry. */
export const MAX_NOTIFY_ATTEMPTS = 6;

/** Leads younger than this are left to the request that saved them. */
const RETRY_MIN_AGE = '-2 minutes';

/** Leads one scheduled run picks up, oldest first. */
const RETRY_BATCH = 20;

type Db = Pick<D1Database, 'prepare'>;

export type QuoteLeadMailer = {
  /** The team's notification email. Rejects when it was not sent. */
  send: (lead: QuoteLead, leadId: number, submittedAt: Date) => Promise<void>;
  /** The give-up alert to the agency address. Rejects when it was not sent. */
  alert: (lead: QuoteLead, leadId: number, submittedAt: Date, attempts: number) => Promise<void>;
};

export type QuoteLeadRow = {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  reply_by: string | null;
  vehicle: string | null;
  service_interest: string | null;
  source_url: string | null;
  locale: string | null;
  attribution_json: string | null;
  created_at: string;
  notified_at: string | null;
  notify_attempts: number;
};

const ROW_COLUMNS = `id, name, phone, email, notes, reply_by, vehicle, service_interest, source_url, locale,
  attribution_json, created_at, notified_at, notify_attempts`;

/** The lead as the notification email needs it, rebuilt from its stored row. */
export function quoteLeadFromRow(row: QuoteLeadRow): QuoteLead {
  const reply: QuoteReply | null = row.reply_by === 'call' || row.reply_by === 'whatsapp' ? row.reply_by : null;
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    reply,
    vehicle: row.vehicle,
    service: row.service_interest,
    page: row.source_url,
    locale: row.locale === 'ar' ? 'ar' : 'en',
    attribution: parseLeadAttribution(row.attribution_json),
  };
}

/** Structured log line for Workers Logs. Never carries the customer's details. */
function log(level: 'log' | 'warn' | 'error', message: string, fields: Record<string, unknown>) {
  console[level](JSON.stringify({ message, ...fields }));
}

/** D1's CURRENT_TIMESTAMP ("2026-10-30 14:39:28", UTC) as a Date. */
export function storedTime(value: string): Date {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

const errorType = (error: unknown) => (error instanceof Error ? error.name : 'UnknownError');

/**
 * Tries the notification up to `tries` times and records each try on the
 * lead. Resolves true once the email is sent. Never rejects.
 */
export async function notifyQuoteLead(
  db: Db,
  mailer: QuoteLeadMailer,
  lead: QuoteLead,
  leadId: number,
  submittedAt: Date,
  { tries = 1, pauseMs = 1000 }: { tries?: number; pauseMs?: number } = {},
): Promise<boolean> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      await mailer.send(lead, leadId, submittedAt);
    } catch (error) {
      const attempts = await recordFailure(db, leadId, errorType(error));
      log('error', 'Quote lead notification failed', { leadId, attempts, errorType: errorType(error) });
      if (attempts !== null && attempts >= MAX_NOTIFY_ATTEMPTS) {
        await giveUp(mailer, lead, leadId, submittedAt, attempts);
        return false;
      }
      if (attempt < tries) await new Promise((resolve) => setTimeout(resolve, pauseMs));
      continue;
    }
    try {
      await db
        .prepare(
          `UPDATE quote_form_leads
             SET notified_at = CURRENT_TIMESTAMP, notify_attempts = notify_attempts + 1, notify_error = NULL
           WHERE id = ?`,
        )
        .bind(leadId)
        .run();
    } catch (error) {
      // The email went out; a missing stamp only means the retry may send it twice.
      log('error', 'Quote lead notified but not marked', { leadId, errorType: errorType(error) });
    }
    return true;
  }
  return false;
}

/** Counts a failed try. Resolves the new count, or null when it could not be recorded. */
async function recordFailure(db: Db, leadId: number, reason: string): Promise<number | null> {
  try {
    const row = await db
      .prepare(
        `UPDATE quote_form_leads SET notify_attempts = notify_attempts + 1, notify_error = ?
         WHERE id = ? RETURNING notify_attempts`,
      )
      .bind(reason, leadId)
      .first<{ notify_attempts: number }>();
    return row?.notify_attempts ?? null;
  } catch (error) {
    log('error', 'Quote lead notification failure not recorded', { leadId, errorType: errorType(error) });
    return null;
  }
}

async function giveUp(mailer: QuoteLeadMailer, lead: QuoteLead, leadId: number, submittedAt: Date, attempts: number) {
  log('error', 'Quote lead notification abandoned', { leadId, attempts });
  try {
    await mailer.alert(lead, leadId, submittedAt, attempts);
  } catch (error) {
    log('error', 'Quote lead alert failed', { leadId, errorType: errorType(error) });
  }
}

/**
 * A resend of a request that was already saved: if the first request tried
 * the email and it failed, try again now. A lead with no tries yet is left to
 * the request still sending it (or to the scheduled retry). Never rejects.
 */
export async function renotifyQuoteLeadByRequest(db: Db, mailer: QuoteLeadMailer, requestId: string): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT ${ROW_COLUMNS} FROM quote_form_leads WHERE request_id = ?`)
      .bind(requestId)
      .first<QuoteLeadRow>();
    if (!row || row.notified_at !== null || row.notify_attempts < 1 || row.notify_attempts >= MAX_NOTIFY_ATTEMPTS) return false;
    return await notifyQuoteLead(db, mailer, quoteLeadFromRow(row), row.id, storedTime(row.created_at));
  } catch (error) {
    log('error', 'Quote lead resend check failed', { errorType: errorType(error) });
    return false;
  }
}

/** The scheduled retry: one more try for each saved lead whose email has not gone out. */
export async function retryQuoteLeadNotifications(db: Db, mailer: QuoteLeadMailer): Promise<{ tried: number; sent: number }> {
  const { results } = await db
    .prepare(
      `SELECT ${ROW_COLUMNS} FROM quote_form_leads
       WHERE notified_at IS NULL AND notify_attempts < ? AND created_at <= datetime('now', ?)
       ORDER BY id LIMIT ?`,
    )
    .bind(MAX_NOTIFY_ATTEMPTS, RETRY_MIN_AGE, RETRY_BATCH)
    .all<QuoteLeadRow>();
  let sent = 0;
  for (const row of results) {
    if (await notifyQuoteLead(db, mailer, quoteLeadFromRow(row), row.id, storedTime(row.created_at))) sent++;
  }
  if (results.length) log('log', 'Quote lead notification retry', { tried: results.length, sent });
  return { tried: results.length, sent };
}
