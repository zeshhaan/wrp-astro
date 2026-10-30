/**
 * The Worker's entrypoint (wrangler.jsonc `main`): Astro answers every request,
 * as the adapter's default entrypoint does, and the Cron Trigger retries quote
 * lead emails that did not go out (src/lib/quote-lead-notify.ts).
 * Docs: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
 */
import { handle } from '@astrojs/cloudflare/handler';
import { quoteLeadMailer } from './lib/quote-lead-email';
import { retryQuoteLeadNotifications } from './lib/quote-lead-notify';

/** Where the retried emails' outcome links point. */
const SITE_ORIGIN = 'https://wrpdetailing.ae';

export default {
  fetch: handle,

  async scheduled(_controller, env, ctx) {
    // Previews carry neither binding, so the retry only ever runs in production.
    if (!env.DB || !env.EMAIL) return;
    ctx.waitUntil(
      retryQuoteLeadNotifications(env.DB, quoteLeadMailer(SITE_ORIGIN)).catch((error) =>
        console.error(JSON.stringify({ message: 'Quote lead notification retry failed', errorType: error instanceof Error ? error.name : 'UnknownError' })),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
