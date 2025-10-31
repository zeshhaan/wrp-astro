import type { APIRoute } from 'astro';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const phone = formData.get('phone')?.toString();
    const vehicle = formData.get('vehicle')?.toString();
    const service = formData.get('service')?.toString();
    const message = formData.get('message')?.toString();

    // Validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Name, email, and message are required'
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
          error: 'Please provide a valid email address'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Save to D1 database
    const db = locals.runtime.env.DB;

    await db.prepare(`
      INSERT INTO contact_submissions (name, email, phone, vehicle, service_interest, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(name, email, phone || null, vehicle || null, service || null, message).run();

    // Send email notification
    try {
      // Create smart, descriptive subject line with fallbacks
      let subjectLine = 'New Contact Form Inquiry';

      if (service && vehicle) {
        // Best case: has both service and vehicle
        subjectLine = `Request for ${service} for ${vehicle} from ${name}`;
      } else if (service) {
        // Has service but no vehicle
        subjectLine = `Request for ${service} from ${name}`;
      } else if (vehicle) {
        // Has vehicle but no service
        subjectLine = `New Inquiry: ${vehicle} - ${name}`;
      } else {
        // Minimal info
        subjectLine = `New Contact from ${name}`;
      }

      const msg = createMimeMessage();
      msg.setSender({ name: 'WRP Contact Form', addr: 'noreply@wrpdetailing.ae' });
      msg.setRecipient('wrp.detailing@gmail.com');
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
                <h1 style="margin: 0;">🚗 New Contact Inquiry</h1>
              </div>
              <div class="content">
                <table>
                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>
                  <tr>
                    <td><strong>Name</strong></td>
                    <td>${name}</td>
                  </tr>
                  <tr>
                    <td><strong>Email</strong></td>
                    <td><a href="mailto:${email}">${email}</a></td>
                  </tr>
                  <tr>
                    <td><strong>Phone</strong></td>
                    <td>${phone ? `<a href="tel:${phone}">${phone}</a>` : 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td><strong>Vehicle</strong></td>
                    <td>${vehicle || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td><strong>Service Interest</strong></td>
                    <td>${service || 'Not specified'}</td>
                  </tr>
                </table>
                <div class="message-box">
                  <strong>Message:</strong><br><br>
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
              <div class="footer">
                <p>Submitted via wrpdetailing.ae contact form on ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      const emailMessage = new EmailMessage(
        'noreply@wrpdetailing.ae',
        'wrp.detailing@gmail.com',
        msg.asRaw()
      );

      await locals.runtime.env.EMAIL.send(emailMessage);
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send email notification:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your message! We will contact you shortly.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred. Please try again or call us directly.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
