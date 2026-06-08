export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'RESEND_API_KEY not set in .env.local' }, { status: 500 });
  }

  const { name, phone, email } = await req.json();

  if (!name || !phone || !email) {
    return Response.json({ error: 'name, phone and email are required' }, { status: 400 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Kody Kiosk <onboarding@resend.dev>',
      to: process.env.LEAD_EMAIL_TO || 'veera@dashinggroup.com.au',
      subject: 'New Lead from Australia Post Kody Kiosk',
      html: `
        <h2>New Kiosk Lead</h2>
        <table cellpadding="8" style="border-collapse:collapse">
          <tr><td><strong>Full Name</strong></td><td>${name}</td></tr>
          <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email}</td></tr>
          <tr><td><strong>Submitted</strong></td><td>${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</td></tr>
        </table>
      `,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[lead] Resend error:', data);
    return Response.json({ error: 'Failed to send email', detail: data }, { status: res.status });
  }

  console.log('[lead] email sent:', data.id);
  return Response.json({ success: true });
}
