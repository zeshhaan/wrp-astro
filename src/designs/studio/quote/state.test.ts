// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { freshState, quoteLeadFields, type Catalog } from './state';

const catalog = {
  services: [],
  ppf: { presets: [], facts: [], films: [], ceramicOnFilm: '' },
  ceramic: { packages: [], facts: [] },
  polish: { packages: [] },
  wash: { levels: [] },
  tint: { options: [] },
  contact: { whatsapp: '', hours: '', schedule: { open: '09:00', close: '19:00', closedDays: [5], timeZone: 'Asia/Dubai' } },
} as Catalog;

describe('quoteLeadFields', () => {
  test('sends no email when the visitor leaves it out', () => {
    const s = freshState();
    s.you.name = 'Sara';
    s.you.phone = '050 123 4567';
    s.you.contact = 'call';
    const fields = quoteLeadFields(s, catalog);
    expect(fields.email).toBe('');
    expect(fields.phone).toBe('050 123 4567');
    expect(fields.reply).toBe('call');
    expect(fields.notes).toContain('Name: Sara');
  });

  test('Arabic enquiries preserve the selected service, price, language and contact details', () => {
    const arabicCatalog: Catalog = {
      ...catalog,
      locale: 'ar',
      services: [{ id: 'wash', name: 'العناية الشاملة', short: '', from: 100, time: '', minutes: 0, href: '', line: '' }],
      wash: { levels: [{ level: 1, name: 'المستوى الأول', tagline: 'صيانة أساسية', sedan: 100, suv: 120, features: [] }] },
    };
    const s = freshState();
    s.body = 'suv';
    s.services = ['wash'];
    s.wash.level = 1;
    s.you.name = 'مريم';
    s.you.phone = '٠٥٠ ١٢٣ ٤٥٦٧';
    s.when.day = '2026-12-05';
    const lead = quoteLeadFields(s, arabicCatalog);
    expect(lead.locale).toBe('ar');
    expect(lead.phone).toBe('050 123 4567');
    expect(lead.service).toBe('العناية الشاملة');
    expect(lead.notes).toContain('١٢٠ د.إ.');
    expect(lead.notes).toContain('السبت');
    expect(lead.notes).toContain('مريم');
  });

  test('keeps every field inside the quote action limits', () => {
    const s = freshState();
    s.make = 'x'.repeat(300);
    s.you.name = 'n'.repeat(300);
    s.you.notes = 'y'.repeat(9000);
    const fields = quoteLeadFields(s, catalog);
    expect(fields.name.length).toBeLessThanOrEqual(100);
    expect(fields.vehicle.length).toBeLessThanOrEqual(120);
    expect(fields.service.length).toBeLessThanOrEqual(120);
    expect(fields.notes.length).toBeLessThanOrEqual(5000);
  });
});
