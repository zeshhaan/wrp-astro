// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { parseHostnames, TURNSTILE_TEST_SECRET, verifyTurnstile } from './turnstile';

const hostnames = new Set(['wrpdetailing.ae']);
const answer = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('verifyTurnstile', () => {
  test('passes a verified token with the right action and hostname', async () => {
    let sent: URLSearchParams | undefined;
    const fetcher = (async (_url: string, init: RequestInit) => {
      sent = init.body as URLSearchParams;
      return new Response(JSON.stringify({ success: true, action: 'quote', hostname: 'wrpdetailing.ae' }));
    }) as unknown as typeof fetch;

    expect(
      await verifyTurnstile({ token: 'tok', secret: 's', action: 'quote', hostnames, remoteip: '1.2.3.4', fetcher }),
    ).toEqual({ ok: true });
    expect(sent?.get('response')).toBe('tok');
    expect(sent?.get('remoteip')).toBe('1.2.3.4');
  });

  test('rejects a missing or oversized token without calling Siteverify', async () => {
    const fetcher = (() => {
      throw new Error('should not be called');
    }) as unknown as typeof fetch;
    for (const token of [undefined, '', 'x'.repeat(2049)]) {
      expect(await verifyTurnstile({ token, secret: 's', action: 'quote', hostnames, fetcher })).toEqual({
        ok: false,
        reason: 'missing-token',
      });
    }
  });

  test('rejects a failed, mismatched or unreachable verification', async () => {
    const check = (fetcher: typeof fetch) => verifyTurnstile({ token: 't', secret: 's', action: 'quote', hostnames, fetcher });
    expect(await check(answer({ success: false, 'error-codes': ['timeout-or-duplicate'] }))).toEqual({
      ok: false,
      reason: 'timeout-or-duplicate',
    });
    expect((await check(answer({ success: true, action: 'login', hostname: 'wrpdetailing.ae' }))).ok).toBe(false);
    expect((await check(answer({ success: true, action: 'quote', hostname: 'evil.example' }))).ok).toBe(false);
    expect((await check(answer({}, 500))).ok).toBe(false);
    expect((await check((async () => new Response('not json')) as unknown as typeof fetch)).ok).toBe(false);
  });

  test('skips action and hostname checks for the test secret', async () => {
    expect(
      await verifyTurnstile({
        token: 'XXXX.DUMMY.TOKEN.XXXX',
        secret: TURNSTILE_TEST_SECRET,
        action: 'quote',
        hostnames,
        fetcher: answer({ success: true, action: '', hostname: 'example.com' }),
      }),
    ).toEqual({ ok: true });
  });
});

describe('parseHostnames', () => {
  test('reads a comma list and falls back when empty', () => {
    expect([...parseHostnames(' A.com, b.com ,', ['x'])]).toEqual(['a.com', 'b.com']);
    expect([...parseHostnames(undefined, ['x'])]).toEqual(['x']);
  });
});
