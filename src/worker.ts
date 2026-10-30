import astroWorker from '@astrojs/cloudflare/entrypoints/server';
import { processQuoteNotifications } from './lib/quote-notification-email';

export default {
  ...astroWorker,
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env): Promise<void> {
    try {
      await processQuoteNotifications(env);
    } catch {
      console.error('Quote notification scheduler failed; durable jobs remain queued');
      throw new Error('QuoteNotificationSchedulerFailed');
    }
  },
};
