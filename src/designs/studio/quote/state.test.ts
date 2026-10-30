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
