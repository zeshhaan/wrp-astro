// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { checkTurnstile, turnstileBlocks } from './turnstile';

const reply = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('checkTurnstile', () => {
  test('skips when no secret is configured (dev, previews)', async () => {
    const check = await checkTurnstile({ token: 'abc', secret: undefined, fetchImpl: reply({ success: false }) });
    expect(check.verdict).toBe('skipped');
    expect(turnstileBlocks(check)).toBe(false);
  });

  test('a missing token is let through, not blocked', async () => {
    for (const token of [null, undefined, '', '   ']) {
      const check = await checkTurnstile({ token, secret: 's' });
      expect(check.verdict).toBe('missing');
      expect(turnstileBlocks(check)).toBe(false);
    }
  });

  test('passes a token Cloudflare accepts, sending secret, token and IP', async () => {
    let sent: FormData | undefined;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = init.body as FormData;
      return new Response(JSON.stringify({ success: true }));
    }) as unknown as typeof fetch;
    const check = await checkTurnstile({ token: 'tok', secret: 'sec', ip: '1.2.3.4', fetchImpl });
    expect(check.verdict).toBe('pass');
    expect(sent?.get('secret')).toBe('sec');
    expect(sent?.get('response')).toBe('tok');
    expect(sent?.get('remoteip')).toBe('1.2.3.4');
  });

  test('blocks a forged or replayed token', async () => {
    for (const code of ['invalid-input-response', 'timeout-or-duplicate']) {
      const check = await checkTurnstile({ token: 'tok', secret: 's', fetchImpl: reply({ success: false, 'error-codes': [code] }) });
      expect(check.verdict).toBe('fail');
      expect(turnstileBlocks(check)).toBe(true);
    }
  });

  test('our own setup errors never cost a lead', async () => {
    const badSecret = await checkTurnstile({ token: 'tok', secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['invalid-input-secret'] }) });
    expect(badSecret.verdict).toBe('error');
    const outage = await checkTurnstile({ token: 'tok', secret: 's', fetchImpl: reply({}, 503) });
    expect(outage.verdict).toBe('error');
    const down = await checkTurnstile({
      token: 'tok',
      secret: 's',
      fetchImpl: (async () => {
        throw new Error('network');
      }) as unknown as typeof fetch,
    });
    expect(down.verdict).toBe('error');
    for (const check of [badSecret, outage, down]) expect(turnstileBlocks(check)).toBe(false);
  });

  test('an oversized token is rejected without a round trip', async () => {
    const check = await checkTurnstile({
      token: 'x'.repeat(3000),
      secret: 's',
      fetchImpl: (async () => {
        throw new Error('should not be called');
      }) as unknown as typeof fetch,
    });
    expect(check.verdict).toBe('fail');
  });
});

describe('Cloudflare test keys (live Siteverify)', () => {
  // Cloudflare's documented dummy secrets: 1x...AA always passes, 2x...AA always fails.
  const live = process.env.TURNSTILE_LIVE_TEST === '1' ? test : test.skip;
  live('always-pass and always-fail secrets', async () => {
    const pass = await checkTurnstile({ token: 'XXXX.DUMMY.TOKEN.XXXX', secret: '1x0000000000000000000000000000000AA' });
    expect(pass.verdict).toBe('pass');
    const fail = await checkTurnstile({ token: 'XXXX.DUMMY.TOKEN.XXXX', secret: '2x0000000000000000000000000000000AA' });
    expect(fail.verdict).toBe('fail');
  });
});
