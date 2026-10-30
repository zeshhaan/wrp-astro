import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import { processQuoteNotifications } from '@/lib/quote-notification-email';
import { parseLeadAttribution } from '@/lib/attribution';
import { saveQuoteLeadWithNotification } from '@/lib/quote-notification-recovery';
import {
  isPhone,
  isEmail,
  isHoneypotFilled,
  quoteLeadMode,
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
   * id, so a double press or resend reuses the same lead and durable email job.
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
      form_check: z.string().nullish(),
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
      if (isHoneypotFilled(input.form_check) || isHoneypotFilled(input.company_website)) {
        console.warn('Quote form honeypot rejected submission', { hostname });
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
        leadId = await saveQuoteLeadWithNotification(env.DB, input.requestId, lead);
      } catch {
        console.error('Failed to store quote form lead', { reason: 'Database write failed' });
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save the request' });
      }

      // The lead and notification job are already safe in D1. A cron retries
      // delivery failures independently of the visitor returning or resubmitting.
      try {
        await processQuoteNotifications(env, leadId);
      } catch {
        console.error('Quote notification deferred to scheduler', { leadId });
      }

      return { saved: true, ignored: false };
    },
  }),
};
