import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext/browser';
import { deliverClientLeadWithAgencyCopy } from './lead-email-delivery';
import { createLeadOutcomeLinks, leadOutcomeSigningSecretIsValid, renderLeadOutcomeActions } from './lead-outcome';
import { quoteLeadEmailHtml, quoteLeadSubject, type QuoteLead } from './quote-form-lead';
import { recoverQuoteNotifications, type NotificationAlert } from './quote-notification-recovery';

const SENDER = 'noreply@wrpdetailing.ae';
const CLIENT = 'wrp.detailing@gmail.com';
const OPERATOR = 'work.zeeshan@gmail.com';
const SITE = 'https://www.wrpdetailing.ae';

async function notify(env: Cloudflare.Env, lead: QuoteLead, leadId: number): Promise<void> {
  if (!env.EMAIL) throw new Error('EmailBindingUnavailable');
  let outcomeActions = '';
  if (leadOutcomeSigningSecretIsValid(env.LEAD_OUTCOME_SIGNING_SECRET)) {
    outcomeActions = renderLeadOutcomeActions(
      await createLeadOutcomeLinks(SITE, { kind: 'quote', id: leadId }, env.LEAD_OUTCOME_SIGNING_SECRET),
    );
  } else {
    console.warn('Quote form notification has no outcome links', { leadId });
  }
  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Quote Form', addr: SENDER });
  msg.setRecipient(CLIENT);
  msg.setSubject(`[Lead #${leadId}] ${quoteLeadSubject(lead)}`);
  msg.addMessage({ contentType: 'text/html', data: quoteLeadEmailHtml(lead, outcomeActions, new Date()) });
  await deliverClientLeadWithAgencyCopy({
    agencyRecipient: env.AGENCY_COPY_EMAIL,
    sendClient: () => env.EMAIL.send(new EmailMessage(SENDER, CLIENT, msg.asRaw())),
    sendAgency: (recipient) => env.EMAIL.send(new EmailMessage(SENDER, recipient, msg.asRaw())),
    onAgencyError: () => console.error('Quote agency copy failed; client notification sent', { leadId }),
  });
}

async function alertOperator(env: Cloudflare.Env, leads: NotificationAlert[]): Promise<void> {
  if (!env.EMAIL) throw new Error('EmailBindingUnavailable');
  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Lead Monitor', addr: SENDER });
  msg.setRecipient(OPERATOR);
  msg.setSubject(`WRP: ${leads.length} saved lead notification(s) need attention`);
  msg.addMessage({ contentType: 'text/plain', data: [
    'These quote leads are safely stored in D1, but their notifications remain unsent.',
    ...leads.map((lead) => `Lead #${lead.leadId}: ${lead.status}, ${lead.attempts} attempts`),
    'Pending notifications continue retrying. Exhausted notifications need operator recovery.',
    'See docs/quote-notification-recovery.md for the monitoring and retry procedure.',
  ].join('\n') });
  await env.EMAIL.send(new EmailMessage(SENDER, OPERATOR, msg.asRaw()));
}

/** A missing EMAIL binding fails delivery but never loses the durable job. */
export async function processQuoteNotifications(env: Cloudflare.Env, leadId?: number): Promise<void> {
  if (env.ENVIRONMENT === 'preview' || !env.DB) return;
  await recoverQuoteNotifications({
    db: env.DB,
    send: (lead, id) => notify(env, lead, id),
    // Requests process their own job; scheduled runs also monitor the backlog.
    alert: leadId === undefined ? (leads) => alertOperator(env, leads) : undefined,
    leadId,
  });
}
