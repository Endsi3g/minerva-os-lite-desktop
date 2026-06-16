'use client';

import React, { useState } from 'react';
import { Check, CreditCard, Download, Sparkles, Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type BillingPeriod = 'monthly' | 'yearly';
type BillingTab = 'plans' | 'invoices';

const INVOICES = [
  { id: 'INV-2025-003', date: '1 juin 2025', amount: '49,00 $', status: 'payée' },
  { id: 'INV-2025-002', date: '1 mai 2025', amount: '49,00 $', status: 'payée' },
  { id: 'INV-2025-001', date: '1 avr. 2025', amount: '49,00 $', status: 'payée' },
];

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    description: 'Parfait pour démarrer et tester la prospection locale.',
    monthlyPrice: '0',
    yearlyPrice: '0',
    period: '/mois',
    cta: 'Forfait actuel',
    ctaVariant: 'outline' as const,
    current: true,
    features: [
      'Jusqu\'à 200 leads / mois',
      '1 workspace',
      'Scraping de base (Google Maps)',
      'Génération IA limitée (10 emails/mois)',
      'Synchronisation Supabase',
    ],
  },
  {
    id: 'team',
    name: 'Équipe',
    description: 'Pour agences et équipes de prospection en croissance.',
    monthlyPrice: '49',
    yearlyPrice: '39',
    period: '/mois',
    cta: 'Passer à Équipe',
    ctaVariant: 'primary' as const,
    current: false,
    recommended: true,
    features: [
      'Leads illimités',
      'Workspaces illimités',
      'Membres d\'équipe & rôles (admin, éditeur, lecteur)',
      'Scraping avancé + analyse concurrentielle',
      'IA premium — emails, audits, pipelines',
      'Support prioritaire (< 24h)',
      'Exports PDF & Google Drive',
    ],
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    description: 'Grand compte, volume élevé ou besoins spécifiques.',
    monthlyPrice: null,
    yearlyPrice: null,
    period: '',
    cta: 'Nous contacter',
    ctaVariant: 'outline' as const,
    current: false,
    features: [
      'Tout le forfait Équipe',
      'SLA personnalisé',
      'Intégrations sur mesure (CRM, ERP)',
      'Formation & accompagnement dédié',
      'Facturation entreprise sur devis',
    ],
  },
];

export default function BillingPage() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [tab, setTab] = useState<BillingTab>('plans');

  const tabs: { id: BillingTab; label: string }[] = [
    { id: 'plans', label: 'Forfaits' },
    { id: 'invoices', label: 'Factures' },
  ];

  const handleDownloadInvoice = (invoice: typeof INVOICES[number]) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Facture ${invoice.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 50px; color: #26251e; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
            .meta { font-size: 11px; color: #7a7a76; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            td { padding: 8px 0; border-bottom: 1px solid #e5e5e0; }
            td:first-child { color: #7a7a76; }
            td:last-child { text-align: right; font-weight: 700; }
            .footer { margin-top: 60px; font-size: 10px; color: #7a7a76; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="meta">MINERVA OS REACH LITE · FACTURE</div>
            <h1>Facture ${invoice.id}</h1>
            <div class="meta">Date d'émission : ${invoice.date}</div>
          </div>
          <table>
            <tr><td>Référence</td><td>${invoice.id}</td></tr>
            <tr><td>Date</td><td>${invoice.date}</td></tr>
            <tr><td>Statut</td><td>${invoice.status}</td></tr>
            <tr><td>Montant total</td><td>${invoice.amount}</td></tr>
          </table>
          <div class="footer">Document généré via Minerva OS Reach Lite</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#10b981]" />
            <h1 className="text-base font-bold text-[#26251e]">Facturation</h1>
          </div>
          <p className="text-xs text-[#7a7a76]">
            Gérez votre abonnement Minerva OS et consultez vos factures.
          </p>
        </div>

        {/* Tab + period switcher row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                  tab === t.id
                    ? 'bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]'
                    : 'text-[#7a7a76] hover:text-[#26251e]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'plans' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#555552]">
              <span className={period === 'monthly' ? 'text-[#26251e]' : ''}>Mensuel</span>
              <button
                onClick={() => setPeriod(p => p === 'monthly' ? 'yearly' : 'monthly')}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full border transition-colors',
                  period === 'yearly' ? 'bg-[#10b981] border-[#10b981]' : 'bg-[#e5e5e0] border-[#e5e5e0]'
                )}
              >
                <span className={cn(
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                  period === 'yearly' ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </button>
              <span className={period === 'yearly' ? 'text-[#26251e]' : ''}>
                Annuel
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10b981]/10 text-[#059669] border border-[#10b981]/20">
                  −20%
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Plans tab */}
        {tab === 'plans' && (
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-xl border bg-white p-5 gap-5 transition-shadow',
                    plan.recommended
                      ? 'border-[#10b981] shadow-[0_0_0_1px_#10b981]/20 shadow-md'
                      : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                  )}
                >
                  {plan.recommended && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981] text-white shadow-xs whitespace-nowrap">
                        Recommandé
                      </span>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {plan.id === 'free' && <Sparkles className="h-3.5 w-3.5 text-[#7a7a76]" />}
                      {plan.id === 'team' && <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />}
                      {plan.id === 'enterprise' && <Building2 className="h-3.5 w-3.5 text-[#555552]" />}
                      <span className="text-sm font-bold text-[#26251e]">{plan.name}</span>
                      {plan.current && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#f4f4f3] text-[#555552] border border-[#e5e5e0]">
                          Actuel
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div>
                    {price !== null ? (
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-[#26251e]">{price}$</span>
                        {price !== '0' && (
                          <span className="text-xs text-[#7a7a76] mb-1">
                            {period === 'yearly' ? '/mois (facturé annuellement)' : '/mois'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xl font-black text-[#26251e]">Sur devis</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-[11px] text-[#555552]">
                        <Check className="h-3.5 w-3.5 text-[#10b981] shrink-0 mt-px" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    disabled={plan.current}
                    className={cn(
                      'w-full rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                      plan.current
                        ? 'bg-[#f4f4f3] text-[#7a7a76] border border-[#e5e5e0] cursor-not-allowed'
                        : plan.ctaVariant === 'primary'
                        ? 'bg-[#059669] hover:bg-[#047857] text-white'
                        : 'border border-[#e5e5e0] text-[#555552] hover:border-[#c5c5c0] hover:text-[#26251e]'
                    )}
                  >
                    {plan.cta}
                    {!plan.current && <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoices tab */}
        {tab === 'invoices' && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e0]">
              <h2 className="text-sm font-bold text-[#26251e]">Historique de facturation</h2>
              <span className="text-[10px] font-semibold text-[#7a7a76]">{INVOICES.length} factures</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e0] bg-[#f4f4f3]">
                  <th className="text-left px-5 py-3 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Référence</th>
                  <th className="text-left px-5 py-3 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Date</th>
                  <th className="text-left px-5 py-3 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Montant</th>
                  <th className="text-left px-5 py-3 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Statut</th>
                  <th className="text-right px-5 py-3 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0]/60">
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f4f4f3]/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#26251e] font-mono">{inv.id}</td>
                    <td className="px-5 py-3.5 text-[#555552]">{inv.date}</td>
                    <td className="px-5 py-3.5 font-bold text-[#26251e]">{inv.amount}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        inv.status === 'payée'
                          ? 'bg-[#10b981]/10 text-[#059669] border border-[#10b981]/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      )}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#555552] hover:text-[#26251e] transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Télécharger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {INVOICES.length === 0 && (
              <div className="py-12 text-center text-xs text-[#7a7a76]">
                Aucune facture pour le moment.
              </div>
            )}
          </div>
        )}

        {/* Promo banner */}
        <div className="rounded-xl border border-[#10b981]/20 bg-[#10b981]/5 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#059669]">Passez à Équipe et économisez 20%</p>
            <p className="text-[11px] text-[#555552]">
              Workspaces illimités, membres d'équipe et IA premium — pour 39$/mois en facturation annuelle.
            </p>
          </div>
          <button
            onClick={() => setTab('plans')}
            className="shrink-0 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            Voir les forfaits
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
