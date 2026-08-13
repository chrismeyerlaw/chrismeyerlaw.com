export interface ContactForm {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface Env {
  ASSETS: Fetcher;
  SENDGRID_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_FROM_EMAIL?: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle contact form API
    if (url.pathname === '/api/contact') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          { success: false, error: 'Method not allowed' },
          405
        );
      }

      const contentType = request.headers.get('Content-Type') || '';

      if (!contentType.includes('application/json')) {
        return jsonResponse(
          {
            success: false,
            error: 'Content-Type application/json required',
          },
          400
        );
      }

      if (!env.SENDGRID_API_KEY || !env.CONTACT_TO_EMAIL) {
        return jsonResponse(
          {
            success: false,
            error:
              'Missing email configuration. Set SENDGRID_API_KEY and CONTACT_TO_EMAIL in Cloudflare secrets.',
          },
          500
        );
      }

      try {
        const data: ContactForm = await request.json();
        const { name, email, topic, message } = data;

        if (!name || !email || !topic || !message) {
          return jsonResponse(
            { success: false, error: 'Missing form fields' },
            400
          );
        }

        if (!validateEmail(email)) {
          return jsonResponse(
            { success: false, error: 'Invalid email format' },
            400
          );
        }

        const toEmail = env.CONTACT_TO_EMAIL;
        const fromEmail =
          env.CONTACT_FROM_EMAIL || 'no-reply@chrismeyerlaw.com';

        const emailPayload = {
          personalizations: [
            {
              to: [{ email: toEmail }],
              subject: `New Contact Form Submission: ${topic}`,
            },
          ],
          from: {
            email: fromEmail,
            name: 'Meyer Law Contact Form',
          },
          reply_to: {
            email,
            name,
          },
          content: [
            {
              type: 'text/plain',
              value: `Name: ${name}
Email: ${email}
Topic: ${topic}

Message:
${message}`,
            },
          ],
        };

        const sendgridResponse = await fetch(
          'https://api.sendgrid.com/v3/mail/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
          }
        );

        if (!sendgridResponse.ok) {
          const errText = await sendgridResponse.text();

          return jsonResponse(
            {
              success: false,
              error: `SendGrid error: ${sendgridResponse.status} ${errText}`,
            },
            502
          );
        }

        return jsonResponse({ success: true });
      } catch (err: any) {
        console.error('Contact worker error:', err);

        return jsonResponse(
          {
            success: false,
            error: err?.message ?? 'Internal error',
          },
          500
        );
      }
    }

    // Everything else goes to the Angular application.
    return env.ASSETS.fetch(request);
  },
};