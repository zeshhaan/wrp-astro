// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from 'bun:test';
// @ts-expect-error Bun supplies SQLite at test runtime.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import {
  HANDOFF_MAX_ATTEMPTS,
  contactToCrmLead,
  d1TimeToIso,
  handOffLeads,
  handoffRetryDelay,
  quoteToCrmLead,
  type CrmBinding,
  type CrmLead,
  type CrmResult,
} from './crm-handoff';
import type { QuoteLead } from './quote-form-lead';

const quote: QuoteLead = {
  name: 'Sara', phone: '050 123 4567', email: null, notes: 'Matte finish please',
  reply: 'whatsapp', vehicle: 'BMW X5', service: 'Paint protection film', page: '/services/ppf-dubai/',
  locale: 'ar', attribution: null,
};

// Runs the real migration SQL and the module's real queries on SQLite. Only
// the asynchronous D1 transport is faked, as in quote-notification-recovery.test.ts.
function fixture(existing = { quotes: 0, contacts: 0 }) {
  const sqlite = new Database(':memory:');
  sqlite.exec(`CREATE TABLE quote_form_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT UNIQUE NOT NULL,
    name TEXT, phone TEXT NOT NULL, email TEXT, notes TEXT, reply_by TEXT, vehicle TEXT,
    service_interest TEXT, source_url TEXT, locale TEXT, attribution_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlite.exec(`CREATE TABLE contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
    vehicle TEXT, service_interest TEXT, message TEXT NOT NULL, attribution_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  const addQuote = (requestId: string) =>
    Number(sqlite.query(`INSERT INTO quote_form_leads (request_id, name, phone, reply_by, vehicle, service_interest, source_url, locale)
      VALUES (?, 'Sara', '050 123 4567', 'call', 'BMW X5', 'Ceramic coating', '/', 'en')`).run(requestId).lastInsertRowid);
  const addContact = () =>
    Number(sqlite.query(`INSERT INTO contact_submissions (name, email, message) VALUES ('Omar', 'omar@example.com', 'Price for tint?')`)
      .run().lastInsertRowid);
  for (let i = 0; i < existing.quotes; i++) addQuote(`old-${i}`);
  for (let i = 0; i < existing.contacts; i++) addContact();
  sqlite.exec(readFileSync(new URL('../../migrations/0009_add_crm_handoffs.sql', import.meta.url), 'utf8'));

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
  const handoff = (kind: string, id: number) =>
    sqlite.query('SELECT * FROM crm_handoffs WHERE kind = ? AND lead_id = ?').get(kind, id);
  return { db, sqlite, addQuote, addContact, handoff };
}

/** A stand-in for the CRM: remembers external ids like the real one. */
function fakeCrm(behaviour: { down?: boolean; reject?: boolean } = {}) {
  const received: CrmLead[] = [];
  const ids = new Map<string, number>();
  const crm: CrmBinding & { received: CrmLead[]; behaviour: typeof behaviour } = {
    received,
    behaviour,
    async addLead(lead: CrmLead): Promise<CrmResult> {
      if (crm.behaviour.down) throw new Error('Service unavailable');
      if (crm.behaviour.reject) return { ok: false, error: 'Invalid lead', issues: [{ path: 'phone', message: 'bad' }] };
      received.push(lead);
      const known = ids.get(lead.external_id);
      if (known) return { ok: true, id: known, duplicate: true };
      ids.set(lead.external_id, ids.size + 1);
      return { ok: true, id: ids.size, duplicate: false };
    },
  };
  return crm;
}

describe('CRM lead shape', () => {
  test('a quote lead keeps its details, page and reply preference', () => {
    const lead = quoteToCrmLead(quote, { externalId: 'quote:abc', websiteLeadId: 7, receivedAt: '2026-11-04T10:00:00.000Z' });
    expect(lead).toMatchObject({
      source: 'website', external_id: 'quote:abc', name: 'Sara', phone: '050 123 4567',
      message: 'Matte finish please', received_at: '2026-11-04T10:00:00.000Z',
    });
    expect(lead.subject).toBe('WhatsApp: Paint protection film for BMW X5 from Sara');
    expect(lead.details).toEqual([
      { label: 'Service', value: 'Paint protection film' },
      { label: 'Vehicle', value: 'BMW X5' },
      { label: 'Reply by', value: 'WhatsApp' },
      { label: 'Form', value: 'Quote form' },
      { label: 'Page', value: '/services/ppf-dubai/' },
      { label: 'Language', value: 'Arabic' },
      { label: 'Website lead', value: 'Quote #7' },
    ]);
    expect(lead.email).toBeUndefined();
  });

  test('a contact lead without a phone still carries its email', () => {
    const lead = contactToCrmLead(
      { name: 'Omar', email: 'omar@example.com', phone: null, vehicle: null, service: null, message: 'Hi', locale: 'en', attribution: null },
      { externalId: 'contact:3', websiteLeadId: 3 },
    );
    expect(lead).toMatchObject({ email: 'omar@example.com', subject: 'Estimate request from Omar', message: 'Hi' });
    expect(lead.phone).toBeUndefined();
    expect(lead.details).toContainEqual({ label: 'Form', value: 'Contact page' });
  });

  test('D1 timestamps become ISO times in UTC', () => {
    expect(d1TimeToIso('2026-11-04 13:40:00')).toBe('2026-11-04T13:40:00.000Z');
    expect(d1TimeToIso('nonsense')).toBeUndefined();
    expect(d1TimeToIso(null)).toBeUndefined();
  });
});

describe('handing leads to the CRM', () => {
  test('leads from before the migration are skipped; new ones go across once', async () => {
    const { db, addQuote, addContact, handoff } = fixture({ quotes: 2, contacts: 1 });
    expect(handoff('quote', 1).status).toBe('skipped');
    expect(handoff('contact', 1).status).toBe('skipped');
    const quoteId = addQuote('new-1');
    const contactId = addContact();
    const crm = fakeCrm();

    await handOffLeads({ db, crm });
    expect(crm.received.map((l) => l.external_id)).toEqual(['quote:new-1', `contact:${contactId}`]);
    expect(handoff('quote', quoteId)).toMatchObject({ status: 'sent', crm_lead_id: 1, attempts: 1 });
    expect(handoff('contact', contactId)).toMatchObject({ status: 'sent', crm_lead_id: 2 });

    await handOffLeads({ db, crm });
    expect(crm.received).toHaveLength(2);
  });

  test('right after a form, only that lead is sent', async () => {
    const { db, addQuote } = fixture();
    addQuote('waiting');
    const id = addQuote('just-sent');
    const crm = fakeCrm();
    await handOffLeads({ db, crm, only: { kind: 'quote', id } });
    expect(crm.received.map((l) => l.external_id)).toEqual(['quote:just-sent']);
  });

  test('CRM down: the lead waits, is retried after the backoff, then arrives', async () => {
    const { db, addQuote, handoff } = fixture();
    const id = addQuote('outage');
    const crm = fakeCrm({ down: true });
    let now = 1_000_000;

    await handOffLeads({ db, crm, now: () => now });
    expect(handoff('quote', id)).toMatchObject({ status: 'pending', attempts: 1, last_error: 'crm_unreachable' });
    expect(handoff('quote', id).next_attempt_at).toBe(now + handoffRetryDelay(1));

    crm.behaviour.down = false;
    await handOffLeads({ db, crm, now: () => now + 1_000 });
    expect(crm.received).toHaveLength(0);

    now += handoffRetryDelay(1);
    await handOffLeads({ db, crm, now: () => now });
    expect(crm.received).toHaveLength(1);
    expect(handoff('quote', id)).toMatchObject({ status: 'sent', attempts: 2, last_error: null });
  });

  test('a lead the CRM refuses is not retried', async () => {
    const { db, addQuote, handoff } = fixture();
    const id = addQuote('refused');
    const crm = fakeCrm({ reject: true });
    await handOffLeads({ db, crm, now: () => 0 });
    expect(handoff('quote', id)).toMatchObject({ status: 'rejected', last_error: 'invalid_lead' });
    crm.behaviour.reject = false;
    await handOffLeads({ db, crm, now: () => 10 * 60 * 60_000 });
    expect(crm.received).toHaveLength(0);
  });

  test('gives up after the last attempt and says so', async () => {
    const { db, addQuote, handoff } = fixture();
    const id = addQuote('gone');
    const crm = fakeCrm({ down: true });
    let now = 0;
    for (let i = 0; i < HANDOFF_MAX_ATTEMPTS + 2; i++) {
      await handOffLeads({ db, crm, now: () => now });
      now += 60 * 60_000;
    }
    expect(handoff('quote', id)).toMatchObject({ status: 'exhausted', attempts: HANDOFF_MAX_ATTEMPTS });
  });

  test('a lead being sent elsewhere (leased) is left alone', async () => {
    const { db, sqlite, addQuote } = fixture();
    const id = addQuote('busy');
    sqlite.query("INSERT INTO crm_handoffs (kind, lead_id, lease_until, lease_token) VALUES ('quote', ?, ?, 't')").run(id, 5_000);
    const crm = fakeCrm();
    await handOffLeads({ db, crm, now: () => 1_000 });
    expect(crm.received).toHaveLength(0);
    await handOffLeads({ db, crm, now: () => 6_000 });
    expect(crm.received).toHaveLength(1);
  });
});
