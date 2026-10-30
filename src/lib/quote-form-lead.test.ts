// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { isEmail, isHoneypotFilled, isPhone, quoteLeadEmailHtml, quoteLeadMode, quoteLeadSubject, whatsappReplyLink, type QuoteLead } from './quote-form-lead';
// @ts-expect-error Bun supplies this module at test runtime.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';

const live = { hostname: 'wrpdetailing.ae', page: '/services/ppf-dubai/', hasDatabase: true };

describe('quote honeypot', () => {
  test('allows an empty or absent field and identifies filled spam', () => {
    expect(isHoneypotFilled(undefined)).toBe(false);
    expect(isHoneypotFilled('  ')).toBe(false);
    expect(isHoneypotFilled('https://example.com')).toBe(true);
  });
});

describe('quoteLeadMode', () => {
  test('stores leads only from a live page on the production Worker', () => {
    expect(quoteLeadMode(live)).toBe('live');
    expect(quoteLeadMode({ ...live, hostname: 'www.wrpdetailing.ae' })).toBe('live');
  });

  test('never stores from previews, other hostnames or the Design Lab', () => {
    expect(quoteLeadMode({ ...live, environment: 'preview' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, hostname: 'abc123-wrp-astro.example.workers.dev' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/design-lab/studio/services/ppf-dubai/' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/ar/design-lab/studio/services/ppf-dubai/' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/design-lab/studio/services/ppf-dubai/', dev: true })).toBe('dry-run');
  });

  test('local dev with local bindings runs the whole path', () => {
    expect(quoteLeadMode({ ...live, hostname: 'localhost', dev: true })).toBe('live');
  });

  test('missing database on either production hostname is a failure, never a preview success', () => {
    expect(quoteLeadMode({ ...live, hasDatabase: false })).toBe('unavailable');
    expect(quoteLeadMode({ ...live, hostname: 'www.wrpdetailing.ae', hasDatabase: false })).toBe('unavailable');
    expect(quoteLeadMode({ ...live, hostname: 'localhost', dev: true, hasDatabase: false })).toBe('unavailable');
  });

  test('preview and lab requests remain explicit dry runs without database bindings', () => {
    expect(quoteLeadMode({ ...live, environment: 'preview', hasDatabase: false })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, hostname: 'abc123-wrp-astro.example.workers.dev', hasDatabase: false })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/design-lab/studio/', hasDatabase: false })).toBe('dry-run');
  });
});

describe('isPhone', () => {
  test('takes local and international numbers', () => {
    for (const n of ['050 123 4567', '+971 50 123 4567', '(04) 123-4567']) expect(isPhone(n)).toBe(true);
  });
  test('refuses letters and short numbers', () => {
    for (const n of ['abc', '123', '050-123-456x', '+++ --- ()']) expect(isPhone(n)).toBe(false);
  });
});

describe('optional contact email', () => {
  test('accepts valid email and rejects invalid or overlong supplied values', () => {
    expect(isEmail('driver+quote@example.com')).toBe(true);
    for (const value of ['bad-address', 'driver@', '@example.com', 'a b@example.com', 'driver@example.com\nBCC:test@example.com', `${'a'.repeat(250)}@example.com`]) {
      expect(isEmail(value)).toBe(false);
    }
  });
});

describe('notification', () => {
  const lead: QuoteLead = {
    name: 'Sam <b>',
    phone: '050 123 4567',
    email: null,
    notes: null,
    reply: null,
    vehicle: 'Land Cruiser 2024',
    service: 'Paint Protection Film',
    page: '/services/ppf-dubai/',
    locale: 'en',
    attribution: null,
  };

  test('subject names the service, car and person', () => {
    expect(quoteLeadSubject(lead)).toBe('Website quote: Paint Protection Film for Land Cruiser 2024 from Sam <b>');
    expect(quoteLeadSubject({ ...lead, vehicle: null, service: null })).toBe('Website quote: quote from Sam <b>');
    expect(quoteLeadSubject({ ...lead, name: null, vehicle: null, reply: 'call' })).toBe(
      'Call back: Paint Protection Film from 050 123 4567',
    );
  });

  test('escapes what the visitor typed and links a WhatsApp reply', () => {
    const html = quoteLeadEmailHtml(lead, '', new Date('2026-10-26T10:00:00Z'));
    expect(html).toContain('Sam &lt;b&gt;');
    expect(html).not.toContain('Sam <b>');
    expect(html).toContain('https://wa.me/971501234567');
    const phoneOnly = quoteLeadEmailHtml({ ...lead, name: null, reply: 'whatsapp' }, '', new Date());
    expect(phoneOnly).toContain('Not given');
    expect(phoneOnly).toContain('<strong>WhatsApp</strong>');
  });

  test('WhatsApp link handles local, 00 and + prefixes', () => {
    expect(whatsappReplyLink('050 123 4567')).toBe('https://wa.me/971501234567');
    expect(whatsappReplyLink('00971501234567')).toBe('https://wa.me/971501234567');
    expect(whatsappReplyLink('+44 7700 900123')).toBe('https://wa.me/447700900123');
  });

  test('includes supplied email and notes without interpreting their HTML', () => {
    const html = quoteLeadEmailHtml({ ...lead, email: 'driver@example.com', notes: '<script>alert("x")</script>\nKeep the existing tint' }, '', new Date());
    expect(html).toContain('mailto:driver@example.com');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br>Keep the existing tint');
    expect(html).not.toContain('<script>');
    const attribute = quoteLeadEmailHtml({ ...lead, email: 'x" onmouseover="bad' }, '', new Date());
    expect(attribute).not.toContain('mailto:x" onmouseover=');
  });
});

describe('0007 quote contact details migration', () => {
  test('preserves existing lead rows and exposes optional details in the combined view', () => {
    const db = new Database(':memory:');
    const migration = (filename: string) => readFileSync(new URL(`../../migrations/${filename}`, import.meta.url), 'utf8');
    try {
      // Current 0001 already contains vehicle; historical 0002 adds that same
      // column. Start from the equivalent post-0002 schema without replaying it.
      for (const filename of ['0001_create_contact_submissions.sql', '0003_create_quote_requests.sql', '0004_add_lead_attribution.sql', '0005_add_lead_outcomes.sql', '0006_add_quote_form_leads.sql']) {
        db.exec(migration(filename));
      }
      db.exec(`INSERT INTO contact_submissions (name, email, message) VALUES ('Existing contact', 'contact@example.com', 'Contact note');
        INSERT INTO quote_requests (tally_submission_id, name, message) VALUES ('tally-before', 'Existing popup', 'Popup note');
        INSERT INTO quote_form_leads (request_id, phone, reply_by) VALUES ('hero-before', '0501234567', 'call');`);
      const before = db.query('SELECT * FROM leads ORDER BY lead_kind, id').all();

      db.exec(migration('0007_add_quote_form_contact_details.sql'));
      expect(db.query('SELECT * FROM leads ORDER BY lead_kind, id').all()).toEqual(before);
      expect(db.query('SELECT email, notes FROM quote_form_leads').get()).toEqual({ email: null, notes: null });

      db.query('INSERT INTO quote_form_leads (request_id, phone, email, notes, reply_by) VALUES (?, ?, ?, ?, ?)')
        .run('homepage-after', '0507654321', 'driver@example.com', 'Keep the existing tint', 'whatsapp');
      expect(db.query("SELECT email, message FROM leads WHERE lead_kind = 'quote' AND phone = '0507654321'").get())
        .toEqual({ email: 'driver@example.com', message: 'Keep the existing tint\nAsked for a WhatsApp reply' });
      db.query('INSERT INTO quote_form_leads (request_id, phone) VALUES (?, ?)').run('hero-after', '0501111111');
      expect(db.query("SELECT email, message FROM leads WHERE lead_kind = 'quote' AND phone = '0501111111'").get())
        .toEqual({ email: null, message: null });
      expect(() => db.query('INSERT INTO quote_form_leads (request_id, phone) VALUES (?, ?)').run('homepage-after', '0502222222')).toThrow();
      expect(db.query('SELECT COUNT(*) AS total FROM leads').get()).toEqual({ total: 5 });
    } finally {
      db.close();
    }
  });
});
