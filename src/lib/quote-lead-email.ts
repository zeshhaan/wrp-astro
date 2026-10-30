import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext/browser';
import { deliverClientLeadWithAgencyCopy } from './lead-email-delivery';
import { createLeadOutcomeLinks, leadOutcomeSigningSecretIsValid, renderLeadOutcomeActions } from './lead-outcome';
import { quoteLeadEmailHtml, quoteLeadSubject } from './quote-form-lead';
import type { QuoteLeadMailer } from './quote-lead-notify';

const FROM = 'noreply@wrpdetailing.ae';
const TEAM = 'wrp.detailing@gmail.com';

/**
 * The quote form's emails through the EMAIL binding (Email Workers). `origin`
 * is the site the outcome links point to: the request's own origin, or the
 * live site for the scheduled retry.
 */
export function quoteLeadMailer(origin: string): QuoteLeadMailer {
  return {
    async send(lead, leadId, submittedAt) {
      let outcomeActions = '';
      if (leadOutcomeSigningSecretIsValid(env.LEAD_OUTCOME_SIGNING_SECRET)) {
        outcomeActions = renderLeadOutcomeActions(
          await createLeadOutcomeLinks(origin, { kind: 'quote', id: leadId }, env.LEAD_OUTCOME_SIGNING_SECRET),
        );
      } else {
        console.warn(JSON.stringify({ message: 'Quote lead notification has no outcome links', leadId }));
      }
      const raw = mime(TEAM, quoteLeadSubject(lead), quoteLeadEmailHtml(lead, outcomeActions, submittedAt));

      await deliverClientLeadWithAgencyCopy({
        agencyRecipient: env.AGENCY_COPY_EMAIL,
        sendClient: () => env.EMAIL.send(new EmailMessage(FROM, TEAM, raw)),
        sendAgency: (recipient) => env.EMAIL.send(new EmailMessage(FROM, recipient, raw)),
        onAgencyError: (error) =>
          console.error(JSON.stringify({ message: 'Quote lead agency copy failed', leadId, errorType: error instanceof Error ? error.name : 'UnknownError' })),
      });
    },

    // The team's inbox did not take the lead: send it to the agency address
    // instead, so someone passes it on by hand.
    async alert(lead, leadId, submittedAt, attempts) {
      const recipient = env.AGENCY_COPY_EMAIL?.trim();
      if (!recipient) throw new Error('AGENCY_COPY_EMAIL is not set');
      const note = `
        <div style="margin-top: 18px; padding: 16px; border: 2px solid #d4141c; background: #fff;">
          <strong>Not delivered to ${TEAM}.</strong>
          This lead (#${leadId}) is saved in D1, but its notification failed ${attempts} times.
          Please pass it on to the team.
        </div>`;
      await env.EMAIL.send(
        new EmailMessage(FROM, recipient, mime(recipient, `NOT DELIVERED to WRP: ${quoteLeadSubject(lead)}`, quoteLeadEmailHtml(lead, note, submittedAt))),
      );
    },
  };
}

function mime(to: string, subject: string, html: string): string {
  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Quote Form', addr: FROM });
  msg.setRecipient(to);
  msg.setSubject(subject);
  msg.addMessage({ contentType: 'text/html', data: html });
  return msg.asRaw();
}
