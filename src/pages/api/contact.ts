import type { APIRoute } from 'astro';

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

    // TODO: Send email notification (optional - can use Cloudflare Email Workers or external service)

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
