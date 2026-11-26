import astroWorker from '@astrojs/cloudflare/entrypoints/server';
import { processQuoteNotifications } from './lib/quote-notification-email';
import { logQuoteEvent } from './lib/quote-notification-dispatch';
import { processContactNotifications } from './lib/contact-notification-email';
import { crmBinding, handOffLeads } from './lib/crm-handoff';

export default {
  ...astroWorker,
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env): Promise<void> {
    // Independent jobs: a CRM outage must not hold up lead emails, or the reverse.
    const [emails, contact, crm] = await Promise.allSettled([
      processQuoteNotifications(env),
      processContactNotifications(env),
      retryCrmHandoffs(env),
    ]);
    if (crm.status === 'rejected') logQuoteEvent('error', 'crm_handoff_scheduler_failed');
    if (contact.status === 'rejected') logQuoteEvent('error', 'contact_notification_scheduler_failed');
    if (emails.status === 'rejected') {
      logQuoteEvent('error', 'quote_notification_scheduler_failed');
    }
    if (emails.status === 'rejected' || contact.status === 'rejected') throw new Error('NotificationSchedulerFailed');
  },
};

/** Sends any website lead the CRM hasn't accepted yet (src/lib/crm-handoff.ts). */
async function retryCrmHandoffs(env: Cloudflare.Env): Promise<void> {
  const crm = crmBinding(env);
  if (env.ENVIRONMENT === 'preview' || !env.DB || !crm) return;
  await handOffLeads({ db: env.DB, crm });
}
