import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Champs requis : name, subject, message.' }, { status: 400 });
    }

    const smtpHost = process.env.SUPPORT_SMTP_HOST;
    const smtpPort = parseInt(process.env.SUPPORT_SMTP_PORT || '465');
    const smtpUser = process.env.SUPPORT_SMTP_USER;
    const smtpPass = process.env.SUPPORT_SMTP_PASS;
    const fromEmail = process.env.SUPPORT_SMTP_FROM || 'onboarding@resend.dev';
    const toEmail = process.env.SUPPORT_EMAIL || 'support@minervaos.com';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[support/contact] SMTP not configured — logging message only');
      console.log(`[SUPPORT] From: ${name} <${email}> | Subject: ${subject} | ${message}`);
      return NextResponse.json({ ok: true, note: 'logged' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Minerva OS Support" <${fromEmail}>`,
      replyTo: email ? `${name} <${email}>` : fromEmail,
      to: toEmail,
      subject: `[Support] ${subject}`,
      text: `De : ${name}\nEmail : ${email || 'non fourni'}\n\n${message}`,
      html: `<p><strong>De :</strong> ${name}<br><strong>Email :</strong> ${email || 'non fourni'}</p><hr><p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[support/contact]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
