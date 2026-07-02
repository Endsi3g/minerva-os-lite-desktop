import { NextRequest, NextResponse } from 'next/server';
import type { SeoAuditResult } from '@/app/api/audit-seo/route';

function scoreColor(score: number): string {
  if (score >= 70) return '#059669';
  if (score >= 40) return '#059669';
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
}

function loadTimeBadge(ms: number): string {
  if (ms < 2000) return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#d1fae5;color:#059669;font-size:11px;font-weight:700;">${ms}ms — Rapide</span>`;
  if (ms < 4000) return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#fef3c7;color:#d97706;font-size:11px;font-weight:700;">${ms}ms — Moyen</span>`;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#ef4444;font-size:11px;font-weight:700;">${ms}ms — Lent</span>`;
}

function checkBadge(ok: boolean, label: string): string {
  if (ok) {
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:#d1fae5;color:#059669;font-size:11px;font-weight:700;border:1px solid #6ee7b7;">✓ ${label}</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#ef4444;font-size:11px;font-weight:700;border:1px solid #fca5a5;">✗ ${label}</span>`;
}

function severityIcon(severity: 'error' | 'warning' | 'info'): string {
  if (severity === 'error') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🔵';
}

function buildHtml(auditResult: SeoAuditResult, businessName?: string): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const color = scoreColor(auditResult.score);
  const label = scoreLabel(auditResult.score);

  const passedChecks = auditResult.issues.filter((i) => i.severity === 'info');
  const failedChecks = auditResult.issues.filter((i) => i.severity !== 'info');

  const titleQuality =
    auditResult.hasTitle && auditResult.titleLength >= 50 && auditResult.titleLength <= 70
      ? 'Optimal'
      : auditResult.hasTitle
      ? `Présent (${auditResult.titleLength} car.)`
      : 'Absent';

  const descQuality =
    auditResult.hasDescription && auditResult.descriptionLength >= 120 && auditResult.descriptionLength <= 160
      ? 'Optimale'
      : auditResult.hasDescription
      ? `Présente (${auditResult.descriptionLength} car.)`
      : 'Absente';

  const sortedIssues = [
    ...auditResult.issues.filter((i) => i.severity === 'error'),
    ...auditResult.issues.filter((i) => i.severity === 'warning'),
    ...auditResult.issues.filter((i) => i.severity === 'info'),
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport d'Audit SEO — Minerva OS</title>
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
      line-height: 1.6;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 18px;
      border-bottom: 3px solid #059669;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .brand {
      font-size: 11px;
      font-weight: 800;
      color: #059669;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 22px;
      font-weight: 900;
      color: #26251e;
      letter-spacing: -0.02em;
    }
    .header-meta {
      text-align: right;
      font-size: 11px;
      color: #7a7a76;
      line-height: 1.8;
    }
    .header-meta .url {
      font-weight: 700;
      color: #26251e;
      font-size: 12px;
    }
    .score-section {
      display: flex;
      align-items: center;
      gap: 28px;
      padding: 20px 24px;
      background: #fafaf8;
      border: 2px solid ${color}33;
      border-radius: 12px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .score-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: 4px solid ${color};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-number {
      font-size: 28px;
      font-weight: 900;
      color: ${color};
      line-height: 1;
    }
    .score-slash {
      font-size: 11px;
      color: #7a7a76;
      font-weight: 600;
    }
    .score-info h2 {
      font-size: 18px;
      font-weight: 800;
      color: ${color};
      margin-bottom: 4px;
    }
    .score-info p {
      font-size: 12px;
      color: #7a7a76;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .summary-box {
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e5e0;
    }
    .summary-box.green { background: #f0fdf4; border-color: #bbf7d0; }
    .summary-box.red { background: #fef2f2; border-color: #fecaca; }
    .summary-box h3 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .summary-box.green h3 { color: #059669; }
    .summary-box.red h3 { color: #ef4444; }
    .summary-box ul {
      list-style: none;
      space-y: 4px;
    }
    .summary-box ul li {
      font-size: 11px;
      color: #26251e;
      padding: 2px 0;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7a7a76;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e0;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0ee;
      gap: 12px;
    }
    .section-row:last-child { border-bottom: none; }
    .row-label {
      font-size: 12px;
      color: #26251e;
      font-weight: 600;
      flex: 1;
    }
    .row-detail {
      font-size: 11px;
      color: #7a7a76;
      flex: 2;
    }
    .row-badge {
      flex-shrink: 0;
    }
    .recommendations {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .recommendations ol {
      list-style: none;
      counter-reset: rec-counter;
    }
    .recommendations ol li {
      counter-increment: rec-counter;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      font-size: 12px;
    }
    .recommendations ol li.error {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }
    .recommendations ol li.warning {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
    }
    .recommendations ol li.info {
      background: #f0f9ff;
      border-left: 3px solid #3b82f6;
    }
    .rec-num {
      font-weight: 900;
      font-size: 11px;
      min-width: 20px;
      color: #7a7a76;
      margin-top: 1px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e0;
      text-align: center;
      font-size: 10px;
      color: #7a7a76;
      font-weight: 500;
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

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">Minerva OS</div>
      <div class="report-title">Rapport d'Audit SEO</div>
      ${businessName ? `<div style="margin-top:4px;font-size:12px;color:#7a7a76;">Entreprise : <strong style="color:#26251e;">${businessName}</strong></div>` : ''}
    </div>
    <div class="header-meta">
      <div>Date : <strong>${date}</strong></div>
      <div class="url">${auditResult.url}</div>
    </div>
  </div>

  <!-- Score -->
  <div class="score-section">
    <div class="score-circle">
      <span class="score-number">${auditResult.score}</span>
      <span class="score-slash">/100</span>
    </div>
    <div class="score-info">
      <h2>Score SEO : ${auditResult.score}/100 — ${label}</h2>
      <p>Analyse réalisée le ${date} sur ${auditResult.url}</p>
      <p style="margin-top:6px;">Temps de chargement : ${loadTimeBadge(auditResult.loadTime)}</p>
    </div>
  </div>

  <!-- Summary grid -->
  <div class="summary-grid">
    <div class="summary-box green">
      <h3>✅ Points forts (${passedChecks.length})</h3>
      <ul>
        ${passedChecks.length > 0
          ? passedChecks.map((i) => `<li><span>✓</span><span>${i.label}</span></li>`).join('')
          : '<li><span>Aucun point fort détecté.</span></li>'}
      </ul>
    </div>
    <div class="summary-box red">
      <h3>⚠ Points à améliorer (${failedChecks.length})</h3>
      <ul>
        ${failedChecks.length > 0
          ? failedChecks.slice(0, 6).map((i) => `<li><span>${severityIcon(i.severity)}</span><span>${i.label}</span></li>`).join('')
          : '<li><span>Aucun problème majeur détecté.</span></li>'}
      </ul>
    </div>
  </div>

  <!-- Section 1: Sécurité -->
  <div class="section">
    <div class="section-title">🔒 1. Sécurité</div>
    <div class="section-row">
      <div class="row-label">HTTPS</div>
      <div class="row-detail">${auditResult.https ? 'Connexion sécurisée SSL/TLS active' : 'Connexion non sécurisée — migration HTTPS requise'}</div>
      <div class="row-badge">${checkBadge(auditResult.https, auditResult.https ? 'Sécurisé' : 'Non sécurisé')}</div>
    </div>
  </div>

  <!-- Section 2: Mobile -->
  <div class="section">
    <div class="section-title">📱 2. Mobile</div>
    <div class="section-row">
      <div class="row-label">Balise viewport</div>
      <div class="row-detail">${auditResult.hasViewport ? 'Site adapté aux appareils mobiles' : 'Balise viewport absente — site non responsive'}</div>
      <div class="row-badge">${checkBadge(auditResult.hasViewport, auditResult.hasViewport ? 'Mobile-friendly' : 'Non adapté')}</div>
    </div>
  </div>

  <!-- Section 3: Contenu -->
  <div class="section">
    <div class="section-title">📄 3. Contenu</div>
    <div class="section-row">
      <div class="row-label">Balise Title</div>
      <div class="row-detail">${auditResult.title ? `"${auditResult.title.slice(0, 60)}${auditResult.title.length > 60 ? '…' : ''}"` : 'Absente'}</div>
      <div class="row-badge">${checkBadge(auditResult.hasTitle, titleQuality)}</div>
    </div>
    <div class="section-row">
      <div class="row-label">Meta description</div>
      <div class="row-detail">${auditResult.descriptionContent ? `"${auditResult.descriptionContent.slice(0, 80)}${auditResult.descriptionContent.length > 80 ? '…' : ''}"` : 'Absente'}</div>
      <div class="row-badge">${checkBadge(auditResult.hasDescription, descQuality)}</div>
    </div>
    <div class="section-row">
      <div class="row-label">Balises H1</div>
      <div class="row-detail">${auditResult.h1Count === 1 ? 'Une seule balise H1 (recommandé)' : auditResult.h1Count === 0 ? 'Aucune balise H1 trouvée' : `${auditResult.h1Count} balises H1 (trop nombreuses)`}</div>
      <div class="row-badge">${checkBadge(auditResult.h1Count === 1, `H1 : ${auditResult.h1Count}`)}</div>
    </div>
  </div>

  <!-- Section 4: Performance -->
  <div class="section">
    <div class="section-title">⚡ 4. Performance</div>
    <div class="section-row">
      <div class="row-label">Temps de chargement</div>
      <div class="row-detail">${auditResult.loadTime < 2000 ? 'Excellent — objectif < 2s atteint' : auditResult.loadTime < 4000 ? 'Moyen — objectif < 2s non atteint' : 'Lent — optimisation critique requise'}</div>
      <div class="row-badge">${loadTimeBadge(auditResult.loadTime)}</div>
    </div>
  </div>

  <!-- Section 5: Tracking -->
  <div class="section">
    <div class="section-title">📊 5. Tracking</div>
    <div class="section-row">
      <div class="row-label">Google Analytics</div>
      <div class="row-detail">${auditResult.hasGA ? 'Outil de tracking Google Analytics détecté' : 'Google Analytics non détecté'}</div>
      <div class="row-badge">${checkBadge(auditResult.hasGA, auditResult.hasGA ? 'Présent' : 'Absent')}</div>
    </div>
    <div class="section-row">
      <div class="row-label">Facebook Pixel</div>
      <div class="row-detail">${auditResult.hasFBPixel ? 'Facebook Pixel détecté' : 'Facebook Pixel non détecté'}</div>
      <div class="row-badge">${checkBadge(auditResult.hasFBPixel, auditResult.hasFBPixel ? 'Présent' : 'Absent')}</div>
    </div>
  </div>

  <!-- Recommendations -->
  <div class="recommendations">
    <div class="section-title">🎯 Recommandations prioritaires</div>
    <ol>
      ${sortedIssues.map((issue, i) => `
        <li class="${issue.severity}">
          <span class="rec-num">${i + 1}.</span>
          <span>${severityIcon(issue.severity)} ${issue.label}</span>
        </li>
      `).join('')}
    </ol>
  </div>

  <!-- Footer -->
  <div class="footer">
    Rapport généré par <strong>Minerva OS Reach Lite</strong> — minerva-os.com &nbsp;·&nbsp; ${date}
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let body: { auditResult?: SeoAuditResult; businessName?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { auditResult, businessName } = body;

  if (!auditResult || typeof auditResult.score !== 'number') {
    return NextResponse.json({ error: 'Missing or invalid auditResult' }, { status: 400 });
  }

  const html = buildHtml(auditResult, businessName);

  return NextResponse.json({ html });
}
