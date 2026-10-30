// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
// @ts-expect-error Bun supplies this module at test runtime.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import {
  MAX_NOTIFY_ATTEMPTS,
  notifyQuoteLead,
  quoteLeadFromRow,
  renotifyQuoteLeadByRequest,
  retryQuoteLeadNotifications,
  storedTime,
  type QuoteLeadMailer,
  type QuoteLeadRow,
} from './quote-lead-notify';

const migration = (filename: string) => readFileSync(new URL(`../../migrations/${filename}`, import.meta.url), 'utf8');

/** The quote table after 0006 to 0008, behind the slice of the D1 API the module uses. */
function database() {
  const sqlite = new Database(':memory:');
  sqlite.exec(migration('0001_create_contact_submissions.sql'));
  for (const filename of ['0003_create_quote_requests.sql', '0004_add_lead_attribution.sql', '0005_add_lead_outcomes.sql', '0006_add_quote_form_leads.sql', '0007_add_quote_form_contact_details.sql', '0008_add_quote_form_notification_status.sql']) {
    sqlite.exec(migration(filename));
  }
  const d1 = {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        run: async () => sqlite.query(sql).run(...values),
        first: async () => sqlite.query(sql).get(...values) ?? null,
        all: async () => ({ results: sqlite.query(sql).all(...values) }),
      }),
    }),
  } as unknown as D1Database;
  const insert = (requestId: string, minutesAgo = 10) =>
    Number(
      sqlite
        .query(`INSERT INTO quote_form_leads (request_id, name, phone, created_at) VALUES (?, 'Sara', '050 123 4567', datetime('now', ?))`)
        .run(requestId, `-${minutesAgo} minutes`).lastInsertRowid,
    );
  const row = (id: number) => sqlite.query('SELECT * FROM quote_form_leads WHERE id = ?').get(id) as QuoteLeadRow & { notify_error: string | null };
  return { d1, insert, row };
}

function mailer(failures: number) {
  const sent: number[] = [];
  const alerts: number[] = [];
  let left = failures;
  const m: QuoteLeadMailer = {
    send: async (_lead, id) => {
      if (left-- > 0) throw new TypeError('send failed');
      sent.push(id);
    },
    alert: async (_lead, id) => void alerts.push(id),
  };
  return { m, sent, alerts };
}

const quiet = <T>(work: () => Promise<T>) => {
  const { log, warn, error } = console;
  console.log = console.warn = console.error = () => {};
  return work().finally(() => Object.assign(console, { log, warn, error }));
};

const lead = quoteLeadFromRow({
  id: 1, name: 'Sara', phone: '050 123 4567', email: null, notes: null, reply_by: 'call', vehicle: null,
  service_interest: null, source_url: '/', locale: 'ar', attribution_json: null, created_at: '2026-10-30 10:00:00',
  notified_at: null, notify_attempts: 0,
});

describe('quoteLeadFromRow', () => {
  test('rebuilds the lead the email needs', () => {
    expect(lead).toMatchObject({ name: 'Sara', reply: 'call', locale: 'ar', page: '/', attribution: null });
    expect(storedTime('2026-10-30 10:00:00').toISOString()).toBe('2026-10-30T10:00:00.000Z');
  });
});

describe('notifyQuoteLead', () => {
  test('stamps a delivered email', async () => {
    const db = database();
    const id = db.insert('a');
    const { m, sent } = mailer(0);
    expect(await notifyQuoteLead(db.d1, m, lead, id, new Date(), { tries: 2, pauseMs: 0 })).toBe(true);
    expect(sent).toEqual([id]);
    expect(db.row(id).notified_at).not.toBeNull();
    expect(db.row(id).notify_attempts).toBe(1);
  });

  test('retries within the request and counts each failed try', async () => {
    const db = database();
    const id = db.insert('a');
    const once = mailer(1);
    expect(await quiet(() => notifyQuoteLead(db.d1, once.m, lead, id, new Date(), { tries: 2, pauseMs: 0 }))).toBe(true);
    expect(db.row(id).notify_attempts).toBe(2);

    const id2 = db.insert('b');
    const never = mailer(99);
    expect(await quiet(() => notifyQuoteLead(db.d1, never.m, lead, id2, new Date(), { tries: 2, pauseMs: 0 }))).toBe(false);
    expect(db.row(id2)).toMatchObject({ notified_at: null, notify_attempts: 2, notify_error: 'TypeError' });
    expect(never.alerts).toEqual([]);
  });
});

describe('renotifyQuoteLeadByRequest', () => {
  test('a resend retries only an email that already failed', async () => {
    const db = database();
    const id = db.insert('a');
    const { m, sent } = mailer(0);
    // No try yet: the first request is still sending it.
    expect(await renotifyQuoteLeadByRequest(db.d1, m, 'a')).toBe(false);
    await quiet(() => notifyQuoteLead(db.d1, mailer(1).m, lead, id, new Date()));
    expect(await renotifyQuoteLeadByRequest(db.d1, m, 'a')).toBe(true);
    expect(sent).toEqual([id]);
    // Delivered: nothing more to do.
    expect(await renotifyQuoteLeadByRequest(db.d1, m, 'a')).toBe(false);
    expect(await renotifyQuoteLeadByRequest(db.d1, m, 'missing')).toBe(false);
  });
});

describe('retryQuoteLeadNotifications', () => {
  test('emails saved leads that have not gone out, and leaves new ones to their request', async () => {
    const db = database();
    const old = db.insert('old', 10);
    const fresh = db.insert('fresh', 0);
    const done = db.insert('done', 10);
    await notifyQuoteLead(db.d1, mailer(0).m, lead, done, new Date());
    const { m, sent } = mailer(0);
    expect(await quiet(() => retryQuoteLeadNotifications(db.d1, m))).toEqual({ tried: 1, sent: 1 });
    expect(sent).toEqual([old]);
    expect(db.row(fresh).notified_at).toBeNull();
  });

  test('sends one alert after the last try, then stops', async () => {
    const db = database();
    const id = db.insert('a', 10);
    const { m, alerts } = mailer(99);
    for (let run = 0; run < MAX_NOTIFY_ATTEMPTS + 2; run++) await quiet(() => retryQuoteLeadNotifications(db.d1, m));
    expect(db.row(id).notify_attempts).toBe(MAX_NOTIFY_ATTEMPTS);
    expect(alerts).toEqual([id]);
  });
});
