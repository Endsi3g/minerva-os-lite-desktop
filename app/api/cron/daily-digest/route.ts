import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function cronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const authHeader = req.headers.get('authorization');
  return !!(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

async function sendDigestEmail(to: string, name: string, stats: {
  emailsSent: number;
  repliesReceived: number;
  agentActions: number;
  appointmentsCreated: number;
  leadsCreated: number;
  tasksDone: number;
}) {
  const smtp = {
    host: process.env.SUPPORT_SMTP_HOST,
    port: parseInt(process.env.SUPPORT_SMTP_PORT || '587'),
    user: process.env.SUPPORT_SMTP_USER,
    pass: process.env.SUPPORT_SMTP_PASS,
  };
  if (!smtp.host || !smtp.user || !smtp.pass) return;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const totalActivity = stats.emailsSent + stats.repliesReceived + stats.agentActions;
  const todayStr = new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });

  await transporter.sendMail({
    from: `"Minerva" <${smtp.user}>`,
    to,
    subject: `📊 Récapitulatif du ${todayStr} — ${totalActivity} actions`,
    html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#26251e;">
  <h2 style="color:#059669;margin-bottom:4px;">Récapitulatif de la journée</h2>
  <p style="color:#7a7a76;margin-top:0;">${todayStr}</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e0;">📧 Emails envoyés</td><td style="text-align:right;font-weight:bold;">${stats.emailsSent}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e0;">💬 Réponses reçues</td><td style="text-align:right;font-weight:bold;">${stats.repliesReceived}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e0;">📅 RDV créés</td><td style="text-align:right;font-weight:bold;">${stats.appointmentsCreated}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e0;">⚡ Actions agent</td><td style="text-align:right;font-weight:bold;">${stats.agentActions}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e0;">🆕 Nouveaux leads</td><td style="text-align:right;font-weight:bold;">${stats.leadsCreated}</td></tr>
    <tr><td style="padding:10px 0;">✅ Tâches complétées</td><td style="text-align:right;font-weight:bold;">${stats.tasksDone}</td></tr>
  </table>
  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite-desktop.vercel.app'}/today" style="display:inline-block;background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir le tableau de bord →</a>
</div>`,
  });
}

export async function GET(req: NextRequest) {
  if (!cronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().split('T')[0];
  const since = `${today}T00:00:00.000Z`;

  // Get all workspaces
  const { data: workspaces } = await adminClient.from('workspaces').select('id, name, owner_id');
  if (!workspaces || workspaces.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  let processed = 0;

  for (const ws of workspaces) {
    try {
      // Parallel stats queries
      const [
        { count: emailsSent },
        { count: repliesReceived },
        { count: agentActions },
        { count: appointmentsCreated },
        { count: leadsCreated },
        { count: tasksDone },
      ] = await Promise.all([
        adminClient.from('drafts').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).gte('created_at', since),
        adminClient.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).not('reply_detected_at', 'is', null).gte('reply_detected_at', since),
        adminClient.from('agent_actions').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).eq('executed', true).gte('created_at', since),
        adminClient.from('notifications').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).eq('type', 'calendar_event_created').gte('created_at', since),
        adminClient.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).gte('created_at', since),
        adminClient.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id).eq('completed', true).gte('updated_at', since),
      ]);

      const stats = {
        emailsSent: emailsSent ?? 0,
        repliesReceived: repliesReceived ?? 0,
        agentActions: agentActions ?? 0,
        appointmentsCreated: appointmentsCreated ?? 0,
        leadsCreated: leadsCreated ?? 0,
        tasksDone: tasksDone ?? 0,
      };

      const summaryText = [
        stats.emailsSent > 0 ? `${stats.emailsSent} email${stats.emailsSent > 1 ? 's' : ''} envoyé${stats.emailsSent > 1 ? 's' : ''}` : null,
        stats.repliesReceived > 0 ? `${stats.repliesReceived} réponse${stats.repliesReceived > 1 ? 's' : ''} reçue${stats.repliesReceived > 1 ? 's' : ''}` : null,
        stats.appointmentsCreated > 0 ? `${stats.appointmentsCreated} RDV créé${stats.appointmentsCreated > 1 ? 's' : ''}` : null,
        stats.agentActions > 0 ? `${stats.agentActions} action${stats.agentActions > 1 ? 's' : ''} agent` : null,
      ].filter(Boolean).join(' · ') || 'Journée calme';

      // Upsert into daily_digests
      await adminClient.from('daily_digests').upsert({
        workspace_id: ws.id,
        date: today,
        emails_sent: stats.emailsSent,
        replies_received: stats.repliesReceived,
        agent_actions_count: stats.agentActions,
        appointments_created: stats.appointmentsCreated,
        leads_created: stats.leadsCreated,
        tasks_completed: stats.tasksDone,
        summary_text: summaryText,
        created_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,date' });

      // In-app notification for owner
      const now = new Date().toISOString();
      await adminClient.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: ws.owner_id,
        workspace_id: ws.id,
        type: 'daily_digest_summary',
        title: '📊 Récapitulatif du jour',
        body: summaryText,
        link: '/today',
        is_read: false,
        created_at: now,
        updated_at: now,
      });

      // Email digest if SMTP configured
      const { data: ownerSettings } = await adminClient
        .from('settings')
        .select('full_name, daily_digest')
        .eq('user_id', ws.owner_id)
        .maybeSingle();

      if (ownerSettings?.daily_digest !== false) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(ws.owner_id);
        const email = authUser?.user?.email;
        if (email) {
          await sendDigestEmail(email, ownerSettings?.full_name || 'Kael', stats).catch(() => {});
        }
      }

      processed++;
    } catch {
      // Skip workspace on error
    }
  }

  return NextResponse.json({ ok: true, processed });
}
