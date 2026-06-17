'use client';

import React from 'react';
import { Check, Zap, Building2, CreditCard } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';

const PLANS = [
  {
    name: 'Gratuit',
    price: '0 $',
    period: 'pour toujours',
    badge: null,
    current: true,
    features: [
      'Jusqu\'à 100 leads',
      '3 agents personnalisés',
      'Chat IA (100 msgs/mois)',
      'Prospection manuelle',
      'Support communauté',
    ],
    cta: 'Plan actuel',
    disabled: true,
    style: 'border-primary bg-primary/5',
    ctaStyle: 'bg-muted text-muted-foreground cursor-default',
  },
  {
    name: 'Pro',
    price: '29 $',
    period: 'par mois',
    badge: 'Populaire',
    current: false,
    features: [
      'Leads illimités',
      'Agents illimités',
      'Chat IA illimité',
      'Prospection automatique',
      'Enrichissement Apify',
      'Support prioritaire',
    ],
    cta: 'Passer au Pro',
    disabled: false,
    style: 'border-border',
    ctaStyle: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  },
  {
    name: 'Entreprise',
    price: 'Sur mesure',
    period: 'par mois',
    badge: null,
    current: false,
    features: [
      'Tout du plan Pro',
      'SSO / SAML',
      'SLA dédié',
      'Onboarding personnalisé',
      'API workspace',
      'Gestionnaire de compte',
    ],
    cta: 'Nous contacter',
    disabled: false,
    style: 'border-border',
    ctaStyle: 'bg-foreground hover:bg-foreground/90 text-background',
  },
];

export function SettingsBillingSection() {
  return (
    <SettingsSectionWrapper
      title="Facturation"
      description="Consultez votre plan, votre utilisation et gérez votre abonnement."
      isSaving={false}
    >
      {/* Current plan summary */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Plan actuel</h3>
          <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">Gratuit</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Vous bénéficiez actuellement du plan Gratuit. Passez au plan Pro pour débloquer toutes les fonctionnalités.
        </p>
      </div>

      {/* Plans comparison */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Comparer les plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`border-2 rounded-xl p-5 bg-card space-y-4 relative ${plan.style}`}>
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              {plan.current && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide bg-muted text-muted-foreground border border-border px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  Plan actuel
                </span>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-[11px] text-muted-foreground">/ {plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-[11px] text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.disabled}
                className={`w-full py-2 text-xs font-bold rounded-lg transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
