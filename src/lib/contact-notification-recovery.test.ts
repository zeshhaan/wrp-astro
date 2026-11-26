// @ts-expect-error Bun supplies this module at test runtime.
import { expect, test } from 'bun:test';
// @ts-expect-error Bun supplies SQLite at test runtime.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { CONTACT_STUDIO_EMAIL, recoverContactNotifications, saveContactWithNotifications } from './contact-notification-recovery';
import { sqliteD1 } from './test/sqlite-d1';

const lead = { name: 'Fixture', message: 'Test enquiry', email: 'test@example.com',
  vehicle: null, phone: null, service_interest: null, attribution_json: null };
const agency = 'copy@example.com';

function fixture(outbox = true) {
  const sqlite = new Database(':memory:');
  const migrate = (file: string) => sqlite.exec(readFileSync(new URL('../../migrations/' + file, import.meta.url), 'utf8'));
  migrate('0001_create_contact_submissions.sql');
  sqlite.exec('ALTER TABLE contact_submissions ADD COLUMN attribution_json TEXT');
  if (outbox) migrate('0010_add_contact_notification_outbox.sql');
  return { db: sqliteD1(sqlite), sqlite };
}

test('contact and recipients commit together, with no duplicate studio envelope', async () => {
  const missing = fixture(false);
  await expect(saveContactWithNotifications(missing.db, lead, agency)).rejects.toThrow();
  expect(missing.sqlite.query('SELECT COUNT(*) AS n FROM contact_submissions').get().n).toBe(0);
  const { db, sqlite } = fixture();
  const first = await saveContactWithNotifications(db, lead, agency);
  const second = await saveContactWithNotifications(db, lead, CONTACT_STUDIO_EMAIL);
  expect(sqlite.query('SELECT lead_id, audience FROM contact_notification_outbox ORDER BY lead_id, audience').all())
    .toEqual([{ lead_id: first, audience: 'agency' }, { lead_id: first, audience: 'studio' }, { lead_id: second, audience: 'studio' }]);
});

for (const unavailable of [CONTACT_STUDIO_EMAIL, agency]) {
  test('recovers only the failed envelope: ' + unavailable, async () => {
    const { db } = fixture();
    const id = await saveContactWithNotifications(db, lead, agency);
    const accepted: string[] = [];
    let time = Date.now();
    let blocked = true;
    const recover = (leadId?: number) => recoverContactNotifications({ db, leadId, now: () => time,
      send: async (saved, address) => {
        expect(saved.id).toBe(id);
        if (address === unavailable && blocked) throw new Error('Temporarily unavailable');
        accepted.push(address);
      },
    });
    await recover(id);
    expect(accepted).toHaveLength(1);
    blocked = false;
    await recover();
    expect(accepted).toHaveLength(1);
    time += 60_000;
    await Promise.all([recover(), recover()]);
    await recover();
    expect(accepted.sort()).toEqual([CONTACT_STUDIO_EMAIL, agency].sort());
  });
}
