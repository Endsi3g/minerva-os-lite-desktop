import { NextRequest, NextResponse } from 'next/server';
import type { Lead } from '@/lib/mock-data';

export interface Service {
  name: string;
  price: number;
  type: string;
  description: string;
}

interface UserInfo {
  name: string;
  company: string;
  email: string;
}

interface ProposalRequestBody {
  lead: Lead;
  services: Service[];
  userInfo: UserInfo;
}

function formatPrice(n: number): string {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 });
}

function buildExecutiveSummary(lead: Lead): string {
  const hasNoWebsite = !lead.website;
  const hasBadRating = lead.rating !== undefined && lead.rating < 4.0;

  const parts: string[] = [];

  parts.push(
    `${lead.businessName} est un(e) ${lead.niche || 'entreprise locale'} situé(e) à ${lead.city || 'votre région'}.`
  );

  if (hasNoWebsite) {
    parts.push(
      `Nous avons constaté l'absence de site web, ce qui représente un frein majeur à la visibilité en ligne et à l'acquisition de nouveaux clients.`
    );
  } else {
    parts.push(
      `Une présence web existe, mais des optimisations ciblées peuvent significativement améliorer la visibilité locale et le taux de conversion.`
    );
  }

  if (hasBadRating) {
    parts.push(
      `Avec une note Google Maps de ${lead.rating?.toFixed(1)}/5, la e-réputation constitue un enjeu prioritaire pour maintenir la confiance des clients.`
    );
  }

  parts.push(
    `Cette proposition commerciale présente les services adaptés à vos besoins pour accélérer votre croissance numérique.`
  );

  return parts.join(' ');
}

function buildHtml(lead: Lead, services: Service[], userInfo: UserInfo): string {
  const date = new Date().toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const validUntilStr = validUntil.toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const totalHT = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const tva = totalHT * 0.15;
  const totalTTC = totalHT + tva;

  const hasNoWebsite = !lead.website;
  const hasBadRating = lead.rating !== undefined && lead.rating < 4.0;

  const summaryText = buildExecutiveSummary(lead);

  const serviceRows = services
    .map(
      (s) => `
    <tr>
      <td style="padding:12px 14px;font-weight:600;color:#26251e;font-size:13px;">${s.name}</td>
      <td style="padding:12px 14px;color:#7a7a76;font-size:12px;max-width:280px;">${s.description || '—'}</td>
      <td style="padding:12px 14px;text-align:right;font-weight:700;color:#059669;font-size:13px;white-space:nowrap;">${formatPrice(s.price || 0)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Proposition Commerciale — ${lead.businessName}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #26251e;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.65;
    }
    .cover {
      padding: 32px 0 28px 0;
      border-bottom: 3px solid #059669;
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .cover-label {
      font-size: 10px;
      font-weight: 800;
      color: #059669;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .cover-title {
      font-size: 26px;
      font-weight: 900;
      color: #26251e;
      letter-spacing: -0.03em;
      line-height: 1.1;
      margin-bottom: 20px;
    }
    .cover-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 16px;
    }
    .party-block {
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e5e0;
      background: #fafaf8;
    }
    .party-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7a7a76;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 800;
      color: #26251e;
      margin-bottom: 4px;
    }
    .party-detail {
      font-size: 11px;
      color: #7a7a76;
      line-height: 1.7;
    }
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7a7a76;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e5e0;
      margin-bottom: 14px;
    }
    .summary-text {
      font-size: 13px;
      color: #26251e;
      background: #fafaf8;
      border-left: 4px solid #059669;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      line-height: 1.7;
    }
    .alert-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    .alert-box.warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .services-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e5e0;
    }
    .services-table thead {
      background: #f0fdf4;
    }
    .services-table thead th {
      padding: 10px 14px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #059669;
      text-align: left;
    }
    .services-table thead th:last-child { text-align: right; }
    .services-table tbody tr { border-bottom: 1px solid #f0f0ee; }
    .services-table tbody tr:last-child { border-bottom: none; }
    .totals {
      margin-top: 14px;
      border: 1px solid #e5e5e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f0f0ee;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.ttc {
      background: #059669;
      color: white;
      font-weight: 800;
      font-size: 15px;
    }
    .total-label { color: inherit; }
    .total-value { font-weight: 700; }
    .terms-box {
      padding: 14px 16px;
      background: #fafaf8;
      border: 1px solid #e5e5e0;
      border-radius: 8px;
      font-size: 12px;
      color: #7a7a76;
      line-height: 1.7;
    }
    .terms-box strong { color: #26251e; }
    .cta-box {
      padding: 18px 20px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: 10px;
      color: white;
      text-align: center;
    }
    .cta-box h3 {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .cta-box p {
      font-size: 12px;
      opacity: 0.9;
      line-height: 1.6;
    }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e5e5e0;
      text-align: center;
      font-size: 10px;
      color: #7a7a76;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 10px 20px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-btn:hover { background: #047857; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-label">Minerva OS — Document Confidentiel</div>
    <div class="cover-title">PROPOSITION COMMERCIALE</div>
    <div style="font-size:12px;color:#7a7a76;margin-bottom:16px;">Date : <strong style="color:#26251e;">${date}</strong></div>

    <div class="cover-parties">
      <div class="party-block">
        <div class="party-label">À l'attention de</div>
        <div class="party-name">${lead.businessName}</div>
        <div class="party-detail">
          ${lead.city ? `📍 ${lead.city}` : ''}
          ${lead.niche ? `<br>🏢 ${lead.niche}` : ''}
          ${lead.website ? `<br>🌐 ${lead.website}` : ''}
          ${lead.rating !== undefined ? `<br>⭐ Note Google : ${lead.rating.toFixed(1)}/5` : ''}
          ${lead.contactName ? `<br>👤 ${lead.contactName}` : ''}
        </div>
      </div>
      <div class="party-block">
        <div class="party-label">De la part de</div>
        <div class="party-name">${userInfo.company || 'Votre agence'}</div>
        <div class="party-detail">
          ${userInfo.name ? `👤 ${userInfo.name}` : ''}
          ${userInfo.email ? `<br>✉ ${userInfo.email}` : ''}
        </div>
      </div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="section-title">📋 Résumé exécutif</div>
    <div class="summary-text">${summaryText}</div>

    ${hasNoWebsite ? `
    <div class="alert-box warning">
      <span>⚠</span>
      <span>Aucun site web détecté pour ${lead.businessName} — opportunité prioritaire d'acquisition digitale.</span>
    </div>` : ''}

    ${hasBadRating ? `
    <div class="alert-box warning">
      <span>⚠</span>
      <span>Note Google Maps faible (${lead.rating?.toFixed(1)}/5) — une stratégie de gestion de l'e-réputation est fortement recommandée.</span>
    </div>` : ''}
  </div>

  <!-- Services Table -->
  <div class="section">
    <div class="section-title">🛠 Services proposés</div>
    <table class="services-table">
      <thead>
        <tr>
          <th>Service</th>
          <th>Description</th>
          <th style="text-align:right;">Prix HT</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span class="total-label">Total HT</span>
        <span class="total-value">${formatPrice(totalHT)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">TVA (15% — Québec)</span>
        <span class="total-value">${formatPrice(tva)}</span>
      </div>
      <div class="total-row ttc">
        <span class="total-label">TOTAL TTC</span>
        <span class="total-value">${formatPrice(totalTTC)}</span>
      </div>
    </div>
  </div>

  <!-- Terms -->
  <div class="section">
    <div class="section-title">📃 Conditions</div>
    <div class="terms-box">
      <p><strong>Validité :</strong> Cette proposition est valable 30 jours, jusqu'au <strong>${validUntilStr}</strong>.</p>
      <p style="margin-top:6px;"><strong>Paiement :</strong> 50% à la commande, solde à la livraison. Virement bancaire ou chèque certifié.</p>
      <p style="margin-top:6px;"><strong>Délais :</strong> Délai de réalisation estimé de 2 à 4 semaines selon la complexité des services.</p>
      <p style="margin-top:6px;"><strong>Révisions :</strong> 2 cycles de révision inclus par livrable.</p>
    </div>
  </div>

  <!-- Call to Action -->
  <div class="section">
    <div class="cta-box">
      <h3>Prêt à passer à l'action ?</h3>
      <p>
        Pour accepter cette proposition, répondez à cet e-mail
        ${userInfo.email ? ` à <strong>${userInfo.email}</strong>` : ''}
        ou contactez-nous directement.
        <br>Nous serons ravis de démarrer votre projet.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <strong>Minerva OS Reach Lite</strong> — minerva-os.com &nbsp;·&nbsp; Proposition commerciale générée le ${date}
    <br>Document confidentiel — usage exclusif de ${lead.businessName}
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let body: ProposalRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lead, services, userInfo } = body;

  if (!lead || !Array.isArray(services) || !userInfo) {
    return NextResponse.json({ error: 'Missing required fields: lead, services, userInfo' }, { status: 400 });
  }

  if (services.length === 0) {
    return NextResponse.json({ error: 'At least one service is required' }, { status: 400 });
  }

  const html = buildHtml(lead, services, userInfo);

  return NextResponse.json({ html });
}
