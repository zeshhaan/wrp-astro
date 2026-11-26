import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext/browser';
import { formatAttributionTouch, parseLeadAttribution } from './attribution';
import { createLeadOutcomeLinks, leadOutcomeSigningSecretIsValid, renderLeadOutcomeActions } from './lead-outcome';
import { CONTACT_STUDIO_EMAIL, recoverContactNotifications, type StoredContact } from './contact-notification-recovery';

async function sendContactNotification(env: Cloudflare.Env, lead: StoredContact, recipient: string): Promise<void> {
  const { name, email, phone, vehicle, service_interest: service, message } = lead;
  const attribution = parseLeadAttribution(lead.attribution_json);
  const submittedAt = new Date(lead.created_at.replace(' ', 'T') + 'Z');
  let outcomeActions = '';
  if (leadOutcomeSigningSecretIsValid(env.LEAD_OUTCOME_SIGNING_SECRET)) {
    outcomeActions = renderLeadOutcomeActions(await createLeadOutcomeLinks(
      'https://wrpdetailing.ae', { kind: 'contact', id: lead.id }, env.LEAD_OUTCOME_SIGNING_SECRET,
    ));
  } else {
    console.warn(JSON.stringify({ event: 'contact_outcome_links_unavailable', leadId: lead.id }));
  }

  let subjectLine = `Estimate Request from ${name}`;
  if (service) subjectLine = `Estimate Request: ${service}${vehicle ? ' for ' + vehicle : ''} from ${name}`;
  else if (vehicle) subjectLine = `Estimate Request: ${vehicle} - ${name}`;
  const msg = createMimeMessage();
  msg.setSender({ name: 'WRP Contact Form', addr: 'noreply@wrpdetailing.ae' });
  msg.setRecipient(CONTACT_STUDIO_EMAIL);
  msg.setSubject(subjectLine);
  msg.addMessage({
    contentType: 'text/html',
    data: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; background: white; }
          th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .message-box { background: white; padding: 15px; margin-top: 15px; border-left: 4px solid #000; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚗 New Estimate Request</h1>
          </div>
          <div class="content">
            <table>
              <tr>
                <th>Field</th>
                <th>Details</th>
              </tr>
              <tr>
                <td><strong>Name</strong></td>
                <td>${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td><strong>Email</strong></td>
                <td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td><strong>Phone</strong></td>
                <td>${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : 'Not provided'}</td>
              </tr>
              <tr>
                <td><strong>Vehicle</strong></td>
                <td>${escapeHtml(vehicle || 'Not provided')}</td>
              </tr>
              <tr>
                <td><strong>Service Interest</strong></td>
                <td>${escapeHtml(service || 'Not specified')}</td>
              </tr>
              ${attribution ? `
              <tr>
                <td><strong>First touch</strong></td>
                <td>${escapeHtml(formatAttributionTouch(attribution.first))}</td>
              </tr>
              <tr>
                <td><strong>Latest source</strong></td>
                <td>${escapeHtml(formatAttributionTouch(attribution.last))}</td>
              </tr>` : ''}
            </table>
            <div class="message-box">
              <strong>Message:</strong><br><br>
              ${escapeHtml(message).replace(/\n/g, '<br>')}
            </div>
            ${outcomeActions}
          </div>
          <div class="footer">
            <p>Submitted via wrpdetailing.ae contact form on ${submittedAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
  // Both envelopes use the studio To header so its agency copy stays private.
  await env.EMAIL.send(new EmailMessage('noreply@wrpdetailing.ae', recipient, msg.asRaw()));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function processContactNotifications(env: Cloudflare.Env, leadId?: number): Promise<void> {
  if (env.ENVIRONMENT === 'preview' || !env.DB) return;
  await recoverContactNotifications({
    db: env.DB, leadId, send: (lead, recipient) => sendContactNotification(env, lead, recipient),
  });
}
