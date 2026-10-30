import astroWorker from '@astrojs/cloudflare/entrypoints/server';
import { processQuoteNotifications } from './lib/quote-notification-email';
import { logQuoteEvent } from './lib/quote-notification-dispatch';

export default {
  ...astroWorker,
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env): Promise<void> {
    try {
      await processQuoteNotifications(env);
    } catch {
      logQuoteEvent('error', 'quote_notification_scheduler_failed');
      throw new Error('QuoteNotificationSchedulerFailed');
    }
  },
};
