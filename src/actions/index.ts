import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext/browser';
import { deliverClientLeadWithAgencyCopy } from '@/lib/lead-email-delivery';
import { parseLeadAttribution, serializeLeadAttribution } from '@/lib/attribution';
import {
  createLeadOutcomeLinks,
  leadOutcomeSigningSecretIsValid,
  renderLeadOutcomeActions,
} from '@/lib/lead-outcome';
import {
  isPhone,
  isEmail,
  isHoneypotFilled,
  quoteLeadEmailHtml,
  quoteLeadMode,
  quoteLeadSubject,
  type QuoteLead,
} from '@/lib/quote-form-lead';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const server = {
  /**
   * The quote form in the hero of the Studio pages (LeadForm.astro). Public, at
   * /_actions/quote/. A lead is a mobile number, with the name, car, the
   * page's service and call-or-WhatsApp when given (phones ask only for the
   * number and how to reply).
   *
   * Order of work: validate, check the honeypot, then, only for a live lead, save
   * to D1 and email the team. The insert is idempotent on the form's request
   * id, so a double press or a resend never makes a second row or email attempt.
   * Worker previews and Design Lab pages stop after validation and answer
   * `{ saved: false }` (see quoteLeadMode), so they never touch the
   * production database or inbox.
   */
  quote: defineAction({
    accept: 'form',
    input: z.object({
      name: optionalText(100),
      phone: z.string().trim().refine(isPhone, 'Please enter a mobile number.'),
      email: optionalText(254).refine((value) => value === null || isEmail(value), 'Please enter a valid email address.'),
      notes: optionalText(5000),
      vehicle: optionalText(120),
      service: optionalText(120),
      reply: z.enum(['call', 'whatsapp']).nullish().catch(null).transform((value) => value ?? null),
      locale: z.enum(['en', 'ar']).catch('en'),
      page: optionalText(300),
      requestId: z.uuid(),
      attribution: z.string().max(4096).nullish(),
      company_website: z.string().nullish(),
    }),
    handler: async (input, context) => {
      const hostname = context.url.hostname;
      const mode = quoteLeadMode({
        hostname,
        page: input.page ?? '',
        environment: env.ENVIRONMENT,
        hasDatabase: Boolean(env.DB),
        dev: import.meta.env.DEV,
      });

      // A filled hidden field is quietly discarded without recording a conversion.
      if (isHoneypotFilled(input.company_website)) return { saved: false, ignored: true };

      if (mode === 'dry-run') return { saved: false, ignored: false };
      if (mode === 'unavailable') {
        console.error('Quote form unavailable: DB binding is missing');
        throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: 'Could not save the request. Please call or WhatsApp us.' });
      }

      const lead: QuoteLead = {
        name: input.name,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        reply: input.reply,
        vehicle: input.vehicle,
        service: input.service,
        page: input.page,
        locale: input.locale,
        attribution: parseLeadAttribution(input.attribution),
      };

      let leadId: number;
      try {
        const inserted = await env.DB.prepare(
          `INSERT INTO quote_form_leads
             (request_id, name, phone, email, notes, reply_by, vehicle, service_interest, source_url, locale, attribution_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (request_id) DO NOTHING`,
        )
          .bind(
            input.requestId,
            lead.name,
            lead.phone,
            lead.email,
            lead.notes,
            lead.reply,
            lead.vehicle,
            lead.service,
            lead.page,
            lead.locale,
            serializeLeadAttribution(lead.attribution),
          )
          .run();
        // Seen this request before: the first one was saved. Email is best-effort.
        if (!inserted.meta.changes) return { saved: true, ignored: false };
        leadId = Number(inserted.meta.last_row_id);
        if (!Number.isSafeInteger(leadId) || leadId < 1) throw new Error('Quote lead insert returned no id');
      } catch (dbError) {
        console.error('Failed to store quote form lead:', dbError);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save the request' });
      }

      // Email is optional: the lead is already safe in D1. Record its ID so
      // operators can locate a saved lead without logging customer details.
      if (!env.EMAIL) {
        console.error('Quote form notification not sent', { leadId, reason: 'EMAIL binding is missing' });
      } else {
        try {
          await notify(lead, leadId, context.url.href);
        } catch (emailError) {
          console.error('Quote form notification not sent', {
            leadId,
            reason: 'Email delivery failed',
            errorType: emailError instanceof Error ? emailError.name : 'UnknownError',
          });
        }
      }

      return { saved: true, ignored: false };
    },
  }),
};

async function notify(lead: QuoteLead, leadId: number, requestUrl: string) {
  let outcomeActions = '';
  if (leadOutcomeSigningSecretIsValid(env.LEAD_OUTCOME_SIGNING_SECRET)) {
    outcomeActions = renderLeadOutcomeActions(
      await createLeadOutcomeLinks(requestUrl, { kind: 'quote', id: leadId }, env.LEAD_OUTCOME_SIGNING_SECRET),
    );
  } else {
    console.warn('Quote form notification has no outcome links', { leadId, reason: 'Outcome signing secret is unavailable' });
  }

  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Quote Form', addr: 'noreply@wrpdetailing.ae' });
  msg.setRecipient('wrp.detailing@gmail.com');
  msg.setSubject(quoteLeadSubject(lead));
  msg.addMessage({ contentType: 'text/html', data: quoteLeadEmailHtml(lead, outcomeActions, new Date()) });

  await deliverClientLeadWithAgencyCopy({
    agencyRecipient: env.AGENCY_COPY_EMAIL,
    sendClient: () => env.EMAIL.send(new EmailMessage('noreply@wrpdetailing.ae', 'wrp.detailing@gmail.com', msg.asRaw())),
    sendAgency: (recipient) => env.EMAIL.send(new EmailMessage('noreply@wrpdetailing.ae', recipient, msg.asRaw())),
    onAgencyError: (error) => console.error('Agency copy failed (quote lead email was still sent):', error),
  });
}
