// Email HTML templates — simple, beautiful, branded in #059669 green
// All CSS is inline for maximum email client compatibility.

// ── Shared layout helpers ──────────────────────────────────────────────────────

function emailHeader(): string {
  return `
    <tr>
      <td style="padding: 32px 40px 24px;">
        <span style="font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">Minerva OS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 40px;">
        <div style="height: 1px; background-color: #e6e5e0;"></div>
      </td>
    </tr>
  `;
}

function emailFooter(): string {
  return `
    <tr>
      <td style="padding: 0 40px;">
        <div style="height: 1px; background-color: #e6e5e0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px 32px; text-align: center;">
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #9b9990; line-height: 1.6;">
          Minerva OS &bull; Gestion de prospects intelligente<br/>
          <span style="color: #c4c2b8;">Vous recevez cet e-mail car vous avez activé les notifications par e-mail. Pour vous désabonner, modifiez vos préférences dans les paramètres.</span>
        </p>
      </td>
    </tr>
  `;
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; letter-spacing: 0.1px;">${label}</a>`;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minerva OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f4f0; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          ${emailHeader()}
          ${content}
          ${emailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Templates ──────────────────────────────────────────────────────────────────

export interface EmailNewLeadOptions {
  recipientName: string;
  businessName: string;
  niche: string;
  city: string;
  score: number;
  leadUrl: string;
}

export function emailNewLead(opts: EmailNewLeadOptions): string {
  const scoreColor = opts.score >= 75 ? '#059669' : opts.score >= 50 ? '#d97706' : '#6b7280';
  const content = `
    <tr>
      <td style="padding: 32px 40px 8px;">
        <h1 style="margin: 0 0 8px; font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #26251e; line-height: 1.3;">
          Nouveau lead détecté
        </h1>
        <p style="margin: 0; font-size: 14px; color: #6b6a62; line-height: 1.5;">
          Bonjour ${opts.recipientName || 'là'},&nbsp;un nouveau lead a été ajouté à votre pipeline.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f8f5; border-radius: 10px; border: 1px solid #e6e5e0;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #9b9990; text-transform: uppercase; letter-spacing: 0.8px;">Entreprise</p>
              <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #26251e;">${opts.businessName}</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 24px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #9b9990; text-transform: uppercase; letter-spacing: 0.7px;">Secteur</p>
                    <p style="margin: 0; font-size: 14px; color: #26251e; font-weight: 500;">${opts.niche}</p>
                  </td>
                  <td style="padding-right: 24px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #9b9990; text-transform: uppercase; letter-spacing: 0.7px;">Ville</p>
                    <p style="margin: 0; font-size: 14px; color: #26251e; font-weight: 500;">${opts.city}</p>
                  </td>
                  <td>
                    <p style="margin: 0 0 2px; font-size: 11px; color: #9b9990; text-transform: uppercase; letter-spacing: 0.7px;">Score</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: ${scoreColor};">${opts.score}/100</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 40px 32px;">
        ${ctaButton('Voir le lead', opts.leadUrl)}
      </td>
    </tr>
  `;
  return emailWrapper(content);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EmailLeadAgingOptions {
  recipientName: string;
  agingLeads: { businessName: string; city: string; daysSince: number; url: string }[];
}

export function emailLeadAging(opts: EmailLeadAgingOptions): string {
  const rows = opts.agingLeads
    .slice(0, 8)
    .map(
      (l) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0efe9;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td>
                <p style="margin: 0 0 2px; font-size: 14px; font-weight: 600; color: #26251e;">${l.businessName}</p>
                <p style="margin: 0; font-size: 12px; color: #9b9990;">${l.city}</p>
              </td>
              <td align="right">
                <span style="display: inline-block; background-color: #fef3c7; color: #d97706; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;">${l.daysSince}j sans activité</span>
              </td>
              <td align="right" style="padding-left: 16px;">
                <a href="${l.url}" style="font-size: 12px; color: #059669; text-decoration: none; font-weight: 600;">Voir →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
    )
    .join('');

  const extra =
    opts.agingLeads.length > 8
      ? `<p style="margin: 12px 0 0; font-size: 12px; color: #9b9990; text-align: center;">et ${opts.agingLeads.length - 8} autres leads…</p>`
      : '';

  const content = `
    <tr>
      <td style="padding: 32px 40px 8px;">
        <h1 style="margin: 0 0 8px; font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #26251e;">
          ${opts.agingLeads.length} lead${opts.agingLeads.length > 1 ? 's' : ''} sans activité
        </h1>
        <p style="margin: 0; font-size: 14px; color: #6b6a62; line-height: 1.5;">
          Bonjour ${opts.recipientName || 'là'},&nbsp;ces leads n'ont pas eu d'activité depuis plus de 7&nbsp;jours.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rows}
        </table>
        ${extra}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 32px;">
        <p style="margin: 0 0 16px; font-size: 13px; color: #6b6a62;">Relancez-les avant qu'ils n'oublient Minerva OS.</p>
        ${ctaButton('Voir mes leads', `${process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite-desktop.vercel.app'}/leads`)}
      </td>
    </tr>
  `;
  return emailWrapper(content);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EmailTaskDueOptions {
  recipientName: string;
  tasks: { title: string; leadName?: string; dueDate: string; url: string }[];
}

export function emailTaskDue(opts: EmailTaskDueOptions): string {
  const rows = opts.tasks
    .slice(0, 10)
    .map(
      (t) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0efe9;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td>
                <p style="margin: 0 0 2px; font-size: 14px; font-weight: 600; color: #26251e;">${t.title}</p>
                ${t.leadName ? `<p style="margin: 0; font-size: 12px; color: #9b9990;">Lead : ${t.leadName}</p>` : ''}
              </td>
              <td align="right" style="padding-left: 16px; white-space: nowrap;">
                <a href="${t.url}" style="font-size: 12px; color: #059669; text-decoration: none; font-weight: 600;">Ouvrir →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
    )
    .join('');

  const extra =
    opts.tasks.length > 10
      ? `<p style="margin: 12px 0 0; font-size: 12px; color: #9b9990; text-align: center;">et ${opts.tasks.length - 10} autres tâches…</p>`
      : '';

  const content = `
    <tr>
      <td style="padding: 32px 40px 8px;">
        <h1 style="margin: 0 0 8px; font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #26251e;">
          ${opts.tasks.length} tâche${opts.tasks.length > 1 ? 's' : ''} à faire aujourd'hui
        </h1>
        <p style="margin: 0; font-size: 14px; color: #6b6a62; line-height: 1.5;">
          Bonjour ${opts.recipientName || 'là'},&nbsp;voici vos tâches prévues pour aujourd'hui.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rows}
        </table>
        ${extra}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 32px;">
        ${ctaButton('Gérer mes tâches', `${process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite-desktop.vercel.app'}/tasks`)}
      </td>
    </tr>
  `;
  return emailWrapper(content);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EmailWeeklyDigestOptions {
  recipientName: string;
  stats: { newLeads: number; contacted: number; won: number; revenue: number };
  topLead?: { businessName: string; city: string; score: number };
  weekNumber: number;
}

export function emailWeeklyDigest(opts: EmailWeeklyDigestOptions): string {
  const { stats, topLead } = opts;
  const revenueFormatted = stats.revenue > 0
    ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(stats.revenue)
    : '—';

  const statBlock = (value: string | number, label: string) => `
    <td align="center" style="padding: 16px 8px;">
      <p style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #26251e; font-family: Outfit, -apple-system, sans-serif;">${value}</p>
      <p style="margin: 0; font-size: 11px; color: #9b9990; text-transform: uppercase; letter-spacing: 0.7px;">${label}</p>
    </td>
  `;

  const topLeadBlock = topLead
    ? `
    <tr>
      <td style="padding: 0 40px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.8px;">Meilleur lead de la semaine</p>
              <p style="margin: 0 0 2px; font-size: 16px; font-weight: 700; color: #26251e;">${topLead.businessName}</p>
              <p style="margin: 0; font-size: 13px; color: #6b6a62;">${topLead.city} &bull; Score&nbsp;: <strong style="color: #059669;">${topLead.score}/100</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `
    : '';

  const content = `
    <tr>
      <td style="padding: 32px 40px 8px;">
        <h1 style="margin: 0 0 8px; font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #26251e;">
          Votre bilan de la semaine&nbsp;${opts.weekNumber}
        </h1>
        <p style="margin: 0; font-size: 14px; color: #6b6a62; line-height: 1.5;">
          Bonjour ${opts.recipientName || 'là'},&nbsp;voici un résumé de vos performances cette semaine.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f8f5; border-radius: 10px; border: 1px solid #e6e5e0;">
          <tr>
            ${statBlock(stats.newLeads, 'Nouveaux leads')}
            ${statBlock(stats.contacted, 'Contactés')}
            ${statBlock(stats.won, 'Gagnés')}
            ${statBlock(revenueFormatted, 'Revenus')}
          </tr>
        </table>
      </td>
    </tr>
    ${topLeadBlock}
    <tr>
      <td style="padding: ${topLead ? '0' : '4px'} 40px 32px;">
        ${ctaButton('Voir mon tableau de bord', `${process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite-desktop.vercel.app'}/cockpit`)}
      </td>
    </tr>
  `;
  return emailWrapper(content);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EmailMentionOptions {
  recipientName: string;
  mentionedBy: string;
  context: string;
  url: string;
}

export function emailMention(opts: EmailMentionOptions): string {
  const content = `
    <tr>
      <td style="padding: 32px 40px 8px;">
        <h1 style="margin: 0 0 8px; font-family: Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #26251e;">
          Vous avez été mentionné(e)
        </h1>
        <p style="margin: 0; font-size: 14px; color: #6b6a62; line-height: 1.5;">
          Bonjour ${opts.recipientName || 'là'},&nbsp;<strong style="color: #26251e;">${opts.mentionedBy}</strong> vous a mentionné(e) sur Minerva OS.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f8f5; border-radius: 10px; border: 1px solid #e6e5e0;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; color: #9b9990; text-transform: uppercase; letter-spacing: 0.8px;">Message</p>
              <p style="margin: 0; font-size: 14px; color: #26251e; line-height: 1.6; font-style: italic;">"${opts.context}"</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 40px 32px;">
        ${ctaButton('Voir le message', opts.url)}
      </td>
    </tr>
  `;
  return emailWrapper(content);
}
