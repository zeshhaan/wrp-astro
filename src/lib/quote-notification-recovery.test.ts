// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from 'bun:test';
// @ts-expect-error Bun supplies SQLite at test runtime.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { NOTIFICATION_LEASE_MS, NOTIFICATION_MAX_ATTEMPTS, notificationRetryDelay, recoverQuoteNotifications, saveQuoteLeadWithNotification } from './quote-notification-recovery';
import type { QuoteLead } from './quote-form-lead';

const lead: QuoteLead = {
  name: 'Recovery test', phone: '+971500000000', email: null, notes: null,
  reply: 'call', vehicle: null, service: null, page: '/', locale: 'en', attribution: null,
};

// Execute actual migration/production SQL, including transactional rollback,
// conditional claims and RETURNING. Only the asynchronous D1 transport is faked.
function fixture(withOutbox = true) {
  const sqlite = new Database(':memory:');
  sqlite.exec(`CREATE TABLE quote_form_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT UNIQUE NOT NULL,
    name TEXT, phone TEXT, email TEXT, notes TEXT, reply_by TEXT, vehicle TEXT,
    service_interest TEXT, source_url TEXT, locale TEXT, attribution_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  if (withOutbox) sqlite.exec(readFileSync(new URL('../../migrations/0008_add_quote_notification_outbox.sql', import.meta.url), 'utf8'));
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    execute() {
      const result = sqlite.query(this.sql).run(...this.values);
      return { success: true, meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) }, results: [] };
    }
    async run() { return this.execute(); }
    async first() { return sqlite.query(this.sql).get(...this.values); }
    async all() { return { results: sqlite.query(this.sql).all(...this.values), success: true }; }
  }
  const db = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => sqlite.transaction(() => statements.map((statement) => statement.execute()))(),
  } as unknown as D1Database;
  const job = () => sqlite.query('SELECT * FROM quote_notification_outbox').get();
  return { db, sqlite, job };
}

describe('quote notification recovery', () => {
  test('missing migration rolls back the lead; new and repeated saves are atomic/idempotent', async () => {
    const missing = fixture(false);
    await expect(saveQuoteLeadWithNotification(missing.db, 'missing-schema', lead)).rejects.toThrow();
    expect(missing.sqlite.query('SELECT count(*) AS total FROM quote_form_leads').get().total).toBe(0);
    const { db, sqlite, job } = fixture();
    const id = await saveQuoteLeadWithNotification(db, 'request-1', lead);
    expect(await saveQuoteLeadWithNotification(db, 'request-1', lead)).toBe(id);
    expect(sqlite.query('SELECT count(*) AS total FROM quote_form_leads').get().total).toBe(1);
    expect(job().lead_id).toBe(id);
  });

  test('failed first send is retained, waits for backoff, then succeeds once', async () => {
    const { db, job } = fixture();
    const id = await saveQuoteLeadWithNotification(db, 'request-2', lead);
    let now = Date.now();
    let attempts = 0;
    const send = async () => { if (++attempts === 1) throw new Error('Transport failed'); };
    await recoverQuoteNotifications({ db, send, leadId: id, now: () => now });
    expect(job().status).toBe('pending');
    await recoverQuoteNotifications({ db, send, now: () => now });
    expect(attempts).toBe(1);
    now += notificationRetryDelay(1);
    await recoverQuoteNotifications({ db, send, now: () => now });
    expect(job().status).toBe('sent');
    await recoverQuoteNotifications({ db, send, now: () => now });
    expect(attempts).toBe(2);
  });

  test('concurrent processors claim only one send; expired crash leases recover', async () => {
    const { db, sqlite, job } = fixture();
    await saveQuoteLeadWithNotification(db, 'request-3', lead);
    let sends = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const now = Date.now();
    const first = recoverQuoteNotifications({ db, now: () => now, send: async () => { sends++; began(); await pending; } });
    await started;
    await recoverQuoteNotifications({ db, now: () => now, send: async () => { sends++; } });
    expect(sends).toBe(1);
    release();
    await first;
    sqlite.exec(`UPDATE quote_notification_outbox SET status='pending', lease_token='crashed', lease_until=${now + NOTIFICATION_LEASE_MS}`);
    await recoverQuoteNotifications({ db, now: () => now + NOTIFICATION_LEASE_MS, send: async () => { sends++; } });
    expect(sends).toBe(2);
    expect(job().status).toBe('sent');
  });

  test('final crash becomes exhausted; failed alerts retry and successful alert is recorded', async () => {
    const { db, sqlite, job } = fixture();
    await saveQuoteLeadWithNotification(db, 'request-4', lead);
    let now = Date.now();
    sqlite.exec(`UPDATE quote_notification_outbox SET attempts=${NOTIFICATION_MAX_ATTEMPTS}, lease_until=${now}`);
    let alertCalls = 0;
    let sends = 0;
    const alert = async () => { if (++alertCalls === 1) throw new Error('Alert unavailable'); };
    const options = { db, send: async () => { sends++; }, alert, now: () => now };
    await recoverQuoteNotifications(options);
    expect(job().status).toBe('exhausted');
    expect(job().alerted_at).toBeNull();
    await recoverQuoteNotifications(options);
    expect(alertCalls).toBe(1);
    now += NOTIFICATION_LEASE_MS;
    await recoverQuoteNotifications(options);
    expect(job().alerted_at).toBe(now);
    await recoverQuoteNotifications(options);
    expect(alertCalls).toBe(2);
    expect(sends).toBe(0);
  });

  test('pre-outbox leads are not silently backfilled or resent', async () => {
    const { db, sqlite } = fixture(false);
    sqlite.exec("INSERT INTO quote_form_leads (request_id, phone) VALUES ('old-request', '+971500000000')");
    sqlite.exec(readFileSync(new URL('../../migrations/0008_add_quote_notification_outbox.sql', import.meta.url), 'utf8'));
    await saveQuoteLeadWithNotification(db, 'old-request', lead);
    expect(sqlite.query('SELECT count(*) AS total FROM quote_notification_outbox').get().total).toBe(0);
  });

  test('retry email retains the original submission time', async () => {
    const { db, sqlite } = fixture();
    await saveQuoteLeadWithNotification(db, 'request-date', lead);
    sqlite.exec("UPDATE quote_form_leads SET created_at = '2026-10-01 08:30:00'");
    let submittedAt: Date | undefined;
    await recoverQuoteNotifications({ db, send: async (_lead, _id, date) => { submittedAt = date; } });
    expect(submittedAt?.toISOString()).toBe('2026-10-01T08:30:00.000Z');
  });

  test('persistent send failures exhaust the retry budget and alert before exhaustion', async () => {
    const { db, job } = fixture();
    await saveQuoteLeadWithNotification(db, 'request-5', lead);
    let now = Date.now();
    let sends = 0;
    const alertStates: string[] = [];
    const options = {
      db,
      send: async () => { sends++; throw new Error('Unavailable'); },
      alert: async (rows: { status: string }[]) => { alertStates.push(...rows.map((row) => row.status)); },
      now: () => now,
    };
    for (let attempt = 1; attempt <= NOTIFICATION_MAX_ATTEMPTS; attempt++) {
      await recoverQuoteNotifications(options);
      now += notificationRetryDelay(attempt);
    }
    expect(job().status).toBe('exhausted');
    expect(job().attempts).toBe(NOTIFICATION_MAX_ATTEMPTS);
    await recoverQuoteNotifications(options);
    expect(sends).toBe(NOTIFICATION_MAX_ATTEMPTS);
    expect(alertStates).toEqual(['pending']);
  });
});
