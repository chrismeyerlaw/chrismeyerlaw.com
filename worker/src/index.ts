export interface ContactForm {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface Env {
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

    // 🔍 DEBUG: log method + headers
    console.log('METHOD:', request.method);
    console.log('HEADERS:', Object.fromEntries(request.headers.entries()));

    if (request.method === 'OPTIONS') {
      console.log('OPTIONS request received');
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      console.log('Rejected: Not a POST request');
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const contentType = request.headers.get('Content-Type') || '';
    console.log('Content-Type:', contentType);

    if (!contentType.includes('application/json')) {
      console.log('Rejected: Invalid content type');
      return jsonResponse({ success: false, error: 'Content-Type application/json required' }, 400);
    }

    // 🔍 DEBUG: show env presence (not values)
    console.log('Env check:', {
      hasSendgrid: !!env.SENDGRID_API_KEY,
      hasToEmail: !!env.CONTACT_TO_EMAIL,
    });

    if (!env.SENDGRID_API_KEY || !env.CONTACT_TO_EMAIL) {
      console.log('Rejected: Missing env vars');
      return jsonResponse({
        success: false,
        error: 'Missing email configuration. Set SENDGRID_API_KEY and CONTACT_TO_EMAIL in Cloudflare secrets.',
      }, 500);
    }

    try {
      const data: ContactForm = await request.json();
      console.log('Parsed body:', data);

      const { name, email, topic, message } = data;

      if (!name || !email || !topic || !message) {
        console.log('Rejected: Missing fields');
        return jsonResponse({ success: false, error: 'Missing form fields' }, 400);
      }

      if (!validateEmail(email)) {
        console.log('Rejected: Invalid email');
        return jsonResponse({ success: false, error: 'Invalid email format' }, 400);
      }

      const toEmail = env.CONTACT_TO_EMAIL;
      const fromEmail = env.CONTACT_FROM_EMAIL || 'no-reply@yourdomain.com';

      const emailPayload = {
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: `New Contact Form Submission: ${topic}`,
          },
        ],
        from: {
          email: fromEmail,
          name: 'Contact Form',
        },
        reply_to: {
          email,
          name,
        },
        content: [
          {
            type: 'text/plain',
            value: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\nMessage:\n${message}`,
          },
        ],
      };

      console.log('Sending to SendGrid...');

      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!sendgridResponse.ok) {
        const errText = await sendgridResponse.text();
        console.log('SendGrid failed:', sendgridResponse.status, errText);
        return jsonResponse({
          success: false,
          error: `SendGrid error: ${sendgridResponse.status} ${errText}`,
        }, 502);
      }

      console.log('Email sent successfully');
      return jsonResponse({ success: true });

    } catch (err: any) {
      console.error('Contact worker error:', err);
      return jsonResponse({ success: false, error: err?.message ?? 'Internal error' }, 500);
    }
  },
};