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
      const msg = createMimeMessage();
      msg.setSender({ name: 'WRP Contact Form', addr: 'noreply@wrpdetailing.ae' });
      msg.setRecipient('wrp.detailing@gmail.com');
      msg.setSubject(`New Contact Form Submission from ${name}`);
      msg.addMessage({
        contentType: 'text/html',
        data: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Vehicle:</strong> ${vehicle || 'Not provided'}</p>
          <p><strong>Service Interest:</strong> ${service || 'Not specified'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Submitted via wrpdetailing.ae contact form</p>
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
