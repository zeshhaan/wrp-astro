// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import {
  createLeadOutcomeLinks,
  createLeadOutcomeToken,
  recordLeadOutcome,
  renderLeadOutcomeActions,
  verifyLeadOutcomeToken,
  type LeadOutcome,
} from './lead-outcome';

const secret = 'test-secret-that-is-longer-than-thirty-two-characters';
const now = Date.parse('2026-09-08T10:00:00.000Z');

describe('lead outcome links', () => {
  test('signs and verifies a bounded action without customer data', async () => {
    const token = await createLeadOutcomeToken({ kind: 'contact', id: 42, outcome: 'booked' }, secret, now);
    const action = await verifyLeadOutcomeToken(token, secret, now);

    expect(action).toEqual({
      kind: 'contact',
      id: 42,
      outcome: 'booked',
      expiresAt: Math.floor(now / 1_000) + 90 * 24 * 60 * 60,
    });
    expect(token).not.toContain('@');
  });

  test('rejects tampered, expired, malformed, and wrongly signed tokens', async () => {
    const token = await createLeadOutcomeToken({ kind: 'tally', id: 7, outcome: 'lost' }, secret, now);

    expect(await verifyLeadOutcomeToken(token.replace('.lost.', '.booked.'), secret, now)).toBeNull();
    expect(await verifyLeadOutcomeToken(token, `${secret}-different`, now)).toBeNull();
    expect(await verifyLeadOutcomeToken(token, secret, now + 91 * 24 * 60 * 60 * 1_000)).toBeNull();
    expect(await verifyLeadOutcomeToken('not-a-token', secret, now)).toBeNull();
  });

  test('refuses to sign with a weak deployment secret', async () => {
    await expect(
      createLeadOutcomeToken({ kind: 'contact', id: 1, outcome: 'booked' }, 'too-short', now),
    ).rejects.toThrow('at least 32 characters');
  });

  test('builds two confirmation links and renders both email actions', async () => {
    const links = await createLeadOutcomeLinks(
      'https://wrpdetailing.ae/api/contact',
      { kind: 'contact', id: 9 },
      secret,
      now,
    );
    const html = renderLeadOutcomeActions(links);

    expect(new URL(links.booked).pathname).toBe('/internal/lead-outcome/');
    expect(new URL(links.lost).pathname).toBe('/internal/lead-outcome/');
    expect(html).toContain('Booked');
    expect(html).toContain('Lost');
    expect(html).toContain('confirmation page');
  });
});

describe('recordLeadOutcome', () => {
  test('records the first outcome atomically and never overwrites it', async () => {
    const fake = createFakeDatabase();
    const timestamp = new Date('2026-09-08T10:00:00.000Z');

    expect(await recordLeadOutcome(fake.db, { kind: 'contact', id: 1, outcome: 'booked' }, timestamp)).toEqual({
      state: 'recorded',
      outcome: 'booked',
      outcomeAt: timestamp.toISOString(),
    });
    expect(await recordLeadOutcome(fake.db, { kind: 'contact', id: 1, outcome: 'lost' }, new Date())).toEqual({
      state: 'already-recorded',
      outcome: 'booked',
      outcomeAt: timestamp.toISOString(),
    });
    expect(fake.value.outcome).toBe('booked');
    expect(fake.successfulUpdates).toBe(1);
  });

  test('distinguishes a missing lead from a duplicate click', async () => {
    const fake = createFakeDatabase(false);
    expect(await recordLeadOutcome(fake.db, { kind: 'tally', id: 999, outcome: 'lost' })).toEqual({
      state: 'not-found',
    });
  });
});

function createFakeDatabase(exists = true): {
  db: D1Database;
  value: { outcome: LeadOutcome | null; outcomeAt: string | null };
  readonly successfulUpdates: number;
} {
  const value: { outcome: LeadOutcome | null; outcomeAt: string | null } = {
    outcome: null,
    outcomeAt: null,
  };
  let successfulUpdates = 0;

  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('UPDATE') && exists && value.outcome === null) {
                value.outcome = params[0] as LeadOutcome;
                value.outcomeAt = params[1] as string;
                successfulUpdates += 1;
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
            async first() {
              return exists ? { ...value } : null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return {
    db,
    value,
    get successfulUpdates() {
      return successfulUpdates;
    },
  };
}
