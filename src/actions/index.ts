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
  LIVE_HOSTS,
  QUOTE_TURNSTILE_ACTION,
  quoteLeadEmailHtml,
  quoteLeadMode,
  quoteLeadSubject,
  type QuoteLead,
} from '@/lib/quote-form-lead';
import { parseHostnames, TURNSTILE_TEST_SECRET, verifyTurnstile } from '@/lib/turnstile';

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
   * Order of work: validate, check Turnstile, then, only for a live lead, save
   * to D1 and email the team. The insert is idempotent on the form's request
   * id, so a double press or a resend never makes a second row or email.
   * Worker previews and Design Lab pages stop after the bot check and answer
   * `{ saved: false }` (see quoteLeadMode), so they never touch the
   * production database or inbox.
   */
  quote: defineAction({
    accept: 'form',
    input: z.object({
      name: optionalText(100),
      phone: z.string().trim().refine(isPhone, 'Please enter a mobile number.'),
      vehicle: optionalText(120),
      service: optionalText(120),
      reply: z.enum(['call', 'whatsapp']).nullish().catch(null).transform((value) => value ?? null),
      locale: z.enum(['en', 'ar']).catch('en'),
      page: optionalText(300),
      requestId: z.uuid(),
      attribution: z.string().max(4096).nullish(),
      'cf-turnstile-response': z.string().max(2048).nullish(),
    }),
    handler: async (input, context) => {
      const hostname = context.url.hostname;
      const mode = quoteLeadMode({
        hostname,
        page: input.page ?? '',
        environment: env.ENVIRONMENT,
        hasBindings: Boolean(env.DB && env.EMAIL),
        dev: import.meta.env.DEV,
      });

      // The live hostnames use the real widget; everywhere else the page uses
      // Cloudflare's test key, which only the test secret accepts.
      const secret = LIVE_HOSTS.includes(hostname) ? env.TURNSTILE_SECRET : TURNSTILE_TEST_SECRET;
      if (secret) {
        const check = await verifyTurnstile({
          token: input['cf-turnstile-response'],
          secret,
          action: QUOTE_TURNSTILE_ACTION,
          hostnames: parseHostnames(env.TURNSTILE_HOSTNAMES, LIVE_HOSTS),
          remoteip: context.request.headers.get('cf-connecting-ip') ?? undefined,
        });
        if (!check.ok) {
          console.warn('Quote form: Turnstile check failed:', check.reason);
          throw new ActionError({ code: 'FORBIDDEN', message: 'Bot check failed' });
        }
      } else {
        // A deploy without the secret still takes leads, as the contact form does.
        console.warn('TURNSTILE_SECRET is not set; quote lead accepted without a bot check');
      }

      if (mode === 'dry-run') return { saved: false };

      const lead: QuoteLead = {
        name: input.name,
        phone: input.phone,
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
             (request_id, name, phone, reply_by, vehicle, service_interest, source_url, locale, attribution_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (request_id) DO NOTHING`,
        )
          .bind(
            input.requestId,
            lead.name,
            lead.phone,
            lead.reply,
            lead.vehicle,
            lead.service,
            lead.page,
            lead.locale,
            serializeLeadAttribution(lead.attribution),
          )
          .run();
        // Seen this request before: the first one was saved and emailed.
        if (!inserted.meta.changes) return { saved: true };
        leadId = Number(inserted.meta.last_row_id);
        if (!Number.isSafeInteger(leadId) || leadId < 1) throw new Error('Quote lead insert returned no id');
      } catch (dbError) {
        console.error('Failed to store quote form lead:', dbError);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save the request' });
      }

      // Email is best-effort: the lead is already safe in D1.
      try {
        await notify(lead, leadId, context.url.href);
      } catch (emailError) {
        console.error('Failed to send quote form notification:', emailError);
      }

      return { saved: true };
    },
  }),
};

async function notify(lead: QuoteLead, leadId: number, requestUrl: string) {
  if (!leadOutcomeSigningSecretIsValid(env.LEAD_OUTCOME_SIGNING_SECRET)) {
    throw new Error('LEAD_OUTCOME_SIGNING_SECRET is missing or too short');
  }
  const outcomeActions = renderLeadOutcomeActions(
    await createLeadOutcomeLinks(requestUrl, { kind: 'quote', id: leadId }, env.LEAD_OUTCOME_SIGNING_SECRET),
  );

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
