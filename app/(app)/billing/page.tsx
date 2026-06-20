'use client';

import React from 'react';
import { CreditCard, Sparkles, Mail } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#26251e]">Facturation</h1>
        <p className="text-xs text-[#7a7a76] mt-1">Gérez votre abonnement et vos paiements.</p>
      </div>

      <div className="rounded-2xl border border-[#e5e5e0] bg-white p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
          <CreditCard className="h-7 w-7 text-[#10b981]" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            Bientôt disponible
          </div>
          <h2 className="text-lg font-bold text-[#26251e] mt-2">Intégration Stripe en cours</h2>
          <p className="text-sm text-[#7a7a76] leading-relaxed max-w-md">
            Le module de facturation en libre-service est en cours de développement. Pour toute question concernant votre abonnement, contactez-nous directement.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/help?tab=contact"
            className="inline-flex items-center gap-2 bg-[#26251e] hover:bg-[#1a1a19] text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contacter le support
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#26251e] rounded-xl px-5 py-2.5 text-xs font-bold transition-colors"
          >
            Paramètres du compte
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e5e0] bg-[#f9f9f7] p-5 space-y-3">
        <h3 className="text-xs font-bold text-[#26251e]">Forfait actuel : Gratuit</h3>
        <ul className="space-y-1.5">
          {[
            'Jusqu\'à 200 leads / mois',
            '1 workspace',
            'Scraping Google Maps & OSM',
            'IA (chat, audit SEO, emails)',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] text-[#555552]">
              <span className="w-4 h-4 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
