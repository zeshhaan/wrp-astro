// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from 'bun:test';
import { dispatchQuoteNotification, logQuoteEvent } from './quote-notification-dispatch';

describe('quote notification dispatch', () => {
  test('returns after registering background work, before delivery completes', async () => {
    let release!: () => void;
    const delivery = new Promise<void>((resolve) => { release = resolve; });
    let background: Promise<void> | undefined;
    await dispatchQuoteNotification(() => delivery, 42, (task) => { background = task; });
    expect(background).toBeDefined();
    let finished = false;
    background!.then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    await background;
    expect(finished).toBe(true);
  });

  test('without a usable execution context, waits for the attempt', async () => {
    let release!: () => void;
    const delivery = new Promise<void>((resolve) => { release = resolve; });
    let finished = false;
    const result = dispatchQuoteNotification(() => delivery, 42, () => { throw new Error('unavailable'); })
      .then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    await result;
    expect(finished).toBe(true);
  });

  test('without an execution context, waits rather than abandoning the attempt', async () => {
    let release!: () => void;
    const delivery = new Promise<void>((resolve) => { release = resolve; });
    let finished = false;
    const result = dispatchQuoteNotification(() => delivery, 42).then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    await result;
    expect(finished).toBe(true);
  });

  test('background failures are caught and logged as a single JSON line', async () => {
    const original = console.error;
    const lines: unknown[][] = [];
    console.error = (...args: unknown[]) => { lines.push(args); };
    try {
      let background: Promise<void> | undefined;
      await dispatchQuoteNotification(async () => { throw new Error('private detail'); }, 42, (task) => { background = task; });
      await background;
      expect(lines).toHaveLength(1);
      expect(lines[0]).toHaveLength(1);
      expect(JSON.parse(lines[0][0] as string)).toEqual({ event: 'quote_notification_deferred', leadId: 42 });
      expect(String(lines[0][0])).not.toContain('private detail');
    } finally {
      console.error = original;
    }
  });

  test('structured logs contain one JSON object', () => {
    const original = console.warn;
    const lines: unknown[][] = [];
    console.warn = (...args: unknown[]) => { lines.push(args); };
    try {
      logQuoteEvent('warn', 'quote_honeypot_rejected', { hostname: 'wrpdetailing.ae' });
      expect(lines).toHaveLength(1);
      expect(lines[0]).toHaveLength(1);
      expect(JSON.parse(lines[0][0] as string)).toEqual({ event: 'quote_honeypot_rejected', hostname: 'wrpdetailing.ae' });
    } finally {
      console.warn = original;
    }
  });
});
