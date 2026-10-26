// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { isPhone, quoteLeadEmailHtml, quoteLeadMode, quoteLeadSubject, whatsappReplyLink, type QuoteLead } from './quote-form-lead';

const live = { hostname: 'wrpdetailing.ae', page: '/services/ppf-dubai/', hasBindings: true };

describe('quoteLeadMode', () => {
  test('stores leads only from a live page on the production Worker', () => {
    expect(quoteLeadMode(live)).toBe('live');
    expect(quoteLeadMode({ ...live, hostname: 'www.wrpdetailing.ae' })).toBe('live');
  });

  test('never stores from previews, other hostnames or the Design Lab', () => {
    expect(quoteLeadMode({ ...live, environment: 'preview' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, hasBindings: false })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, hostname: 'abc123-wrp-astro.example.workers.dev' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/design-lab/studio/services/ppf-dubai/' })).toBe('dry-run');
    expect(quoteLeadMode({ ...live, page: '/design-lab/studio/services/ppf-dubai/', dev: true })).toBe('dry-run');
  });

  test('local dev with local bindings runs the whole path', () => {
    expect(quoteLeadMode({ ...live, hostname: 'localhost', dev: true })).toBe('live');
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

describe('notification', () => {
  const lead: QuoteLead = {
    name: 'Sam <b>',
    phone: '050 123 4567',
    vehicle: 'Land Cruiser 2024',
    service: 'Paint Protection Film',
    page: '/services/ppf-dubai/',
    locale: 'en',
    attribution: null,
  };

  test('subject names the service, car and person', () => {
    expect(quoteLeadSubject(lead)).toBe('Website quote: Paint Protection Film for Land Cruiser 2024 from Sam <b>');
    expect(quoteLeadSubject({ ...lead, vehicle: null, service: null })).toBe('Website quote: quote from Sam <b>');
  });

  test('escapes what the visitor typed and links a WhatsApp reply', () => {
    const html = quoteLeadEmailHtml(lead, '', new Date('2026-10-26T10:00:00Z'));
    expect(html).toContain('Sam &lt;b&gt;');
    expect(html).not.toContain('Sam <b>');
    expect(html).toContain('https://wa.me/971501234567');
  });

  test('WhatsApp link handles local, 00 and + prefixes', () => {
    expect(whatsappReplyLink('050 123 4567')).toBe('https://wa.me/971501234567');
    expect(whatsappReplyLink('00971501234567')).toBe('https://wa.me/971501234567');
    expect(whatsappReplyLink('+44 7700 900123')).toBe('https://wa.me/447700900123');
  });
});
