// Centralized Resend email sender
// RESEND_API_KEY env must be set

const FROM = 'Minerva OS <notifications@minervaos.com>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info('[email] RESEND_API_KEY not set — skipping:', opts.subject);
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[email] Resend error:', err);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] Network error:', e);
    return { ok: false, error: String(e) };
  }
}
