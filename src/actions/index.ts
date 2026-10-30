import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import { parseLeadAttribution, serializeLeadAttribution } from '@/lib/attribution';
import {
  isPhone,
  isEmail,
  isHoneypotFilled,
  quoteLeadMode,
  type QuoteLead,
} from '@/lib/quote-form-lead';
import { quoteLeadMailer } from '@/lib/quote-lead-email';
import { notifyQuoteLead, renotifyQuoteLeadByRequest } from '@/lib/quote-lead-notify';

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
   * id, so a double press or a resend never makes a second row; a resend only
   * retries an email that failed (src/lib/quote-lead-notify.ts).
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
      leave_blank: z.string().nullish(),
    }),
    handler: async (input, context) => {
      const hostname = context.url.hostname;
      // Work the visitor need not wait for runs after the response (waitUntil);
      // without a Workers context (tests, odd runtimes) it is awaited.
      const inBackground = async (work: Promise<unknown>) => {
        const cf = context.locals.cfContext;
        if (cf) cf.waitUntil(work);
        else await work;
      };
      const mode = quoteLeadMode({
        hostname,
        page: input.page ?? '',
        environment: env.ENVIRONMENT,
        hasDatabase: Boolean(env.DB),
        dev: import.meta.env.DEV,
      });

      // A filled hidden field marks a bot: discard it without a conversion, but
      // log it (no customer details) so a real visitor caught by it shows up.
      if (isHoneypotFilled(input.leave_blank)) {
        console.warn(JSON.stringify({ message: 'Quote lead discarded by the honeypot', hostname, page: input.page, locale: input.locale, mode }));
        return { saved: false, ignored: true };
      }

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
        // Seen this request before: the first one was saved. If its email has
        // not gone out yet, this resend tries again.
        if (!inserted.meta.changes) {
          if (env.EMAIL) await inBackground(renotifyQuoteLeadByRequest(env.DB, quoteLeadMailer(context.url.origin), input.requestId));
          return { saved: true, ignored: false };
        }
        leadId = Number(inserted.meta.last_row_id);
        if (!Number.isSafeInteger(leadId) || leadId < 1) throw new Error('Quote lead insert returned no id');
      } catch (dbError) {
        console.error('Failed to store quote form lead:', dbError);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save the request' });
      }

      // Email never decides whether a lead counts: it is already safe in D1.
      // Two tries now, after the response; the Cron Trigger retries the rest
      // (src/lib/quote-lead-notify.ts).
      if (!env.EMAIL) {
        console.error(JSON.stringify({ message: 'Quote lead notification not sent', leadId, reason: 'EMAIL binding is missing' }));
      } else {
        await inBackground(notifyQuoteLead(env.DB, quoteLeadMailer(context.url.origin), lead, leadId, new Date(), { tries: 2 }));
      }

      return { saved: true, ignored: false };
    },
  }),
};
