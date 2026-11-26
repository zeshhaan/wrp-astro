import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseLeadAttribution, serializeLeadAttribution } from '@/lib/attribution';
import { saveContactWithNotifications } from '@/lib/contact-notification-recovery';
import { processContactNotifications } from '@/lib/contact-notification-email';
import { contactToCrmLead, crmBinding, handOffLeads } from '@/lib/crm-handoff';

export const POST: APIRoute = async ({ request, locals }) => {
  let locale = 'en';

  try {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const phone = formData.get('phone')?.toString();
    const vehicle = formData.get('vehicle')?.toString();
    const service = formData.get('service')?.toString();
    const message = formData.get('message')?.toString();
    const attribution = parseLeadAttribution(formData.get('attribution'));
    locale = formData.get('locale')?.toString() === 'ar' ? 'ar' : 'en';

    const isArabic = locale === 'ar';

    // Validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: isArabic
            ? 'الاسم والبريد الإلكتروني والرسالة مطلوبة'
            : 'Name, email, and message are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: isArabic
            ? 'يرجى إدخال بريد إلكتروني صحيح'
            : 'Please provide a valid email address'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const crm = crmBinding(env);
    const thanks = () => new Response(
      JSON.stringify({
        success: true,
        message: isArabic
          ? 'شكراً! سيتواصل فريقنا معك قريباً بعرض سعر مخصص.'
          : 'Thanks! Our team will reach out with your personalized estimate.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // A Worker Preview has no database or email. When it is bound to the demo
    // CRM, the test lead goes there (marked as a preview) and nothing else runs.
    if (env.ENVIRONMENT === 'preview') {
      if (!crm) throw new Error('Preview has no CRM binding');
      const test = contactToCrmLead(
        { name, email, phone: phone || null, vehicle: vehicle || null, service: service || null, message,
          locale: isArabic ? 'ar' : 'en', attribution },
        { externalId: `preview-contact:${crypto.randomUUID()}` },
      );
      test.details = [...(test.details ?? []), { label: 'Sent from', value: `Website preview (${new URL(request.url).hostname})` }];
      const result = await crm.addLead(test);
      if (!result.ok) throw new Error('CRM refused the preview lead');
      return thanks();
    }

    const db = env.DB;
    const leadId = await saveContactWithNotifications(db, {
      name, email, phone: phone || null, vehicle: vehicle || null, service_interest: service || null,
      message, attribution_json: serializeLeadAttribution(attribution),
    }, env.AGENCY_COPY_EMAIL);
    const notify = processContactNotifications(env, leadId)
      .catch(() => console.error(JSON.stringify({ event: 'contact_notification_deferred', leadId })));
    if (locals.cfContext) locals.cfContext.waitUntil(notify);
    else await notify;

    // Then a copy to the CRM. Failures are retried by the cron (src/lib/crm-handoff.ts).
    if (crm) {
      const handoff = handOffLeads({ db, crm, only: { kind: 'contact', id: leadId } })
        .catch(() => console.error(JSON.stringify({ event: 'crm_handoff_deferred', kind: 'contact', leadId })));
      if (locals.cfContext) locals.cfContext.waitUntil(handoff);
      else await handoff;
    }

    return thanks();
  } catch (error) {
    const isArabic = locale === 'ar';
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: isArabic
          ? 'حدث خطأ. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.'
          : 'An error occurred. Please try again or call us directly.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
