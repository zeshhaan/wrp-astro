/** Log only operational metadata, never a lead's submitted values. */
export function logQuoteEvent(level: 'warn' | 'error', event: string, fields: Record<string, string | number | boolean | number[]> = {}): void {
  console[level](JSON.stringify({ event, ...fields }));
}

/** The durable job exists before this is called. Without a Workers execution
 * context, await the attempt so it is not abandoned by the runtime. */
export async function dispatchQuoteNotification(
  send: () => Promise<void>,
  leadId: number,
  waitUntil?: (promise: Promise<void>) => void,
): Promise<void> {
  const task = Promise.resolve().then(send).catch(() => {
    logQuoteEvent('error', 'quote_notification_deferred', { leadId });
  });
  if (waitUntil) {
    try {
      waitUntil(task);
      return;
    } catch {
      // If the context cannot accept the work, do not leave a floating promise.
    }
  }
  await task;
}
