'use client';

import React from 'react';
import { MessageSquare, Bot, MapPin, Brain, BookOpen, Wrench, Check, ArrowRight } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import Link from 'next/link';

const PRODUCTS = [
  {
    icon: MessageSquare, name: 'Chat IA', desc: "Interface de conversation avec les modèles d'IA.", href: '/chat', active: true,
  },
  {
    icon: Bot, name: 'Agents', desc: 'Créez des agents IA spécialisés avec connaissances et instructions.', href: '/agents', active: true,
  },
  {
    icon: MapPin, name: 'Prospection', desc: 'Scrapez et enrichissez automatiquement des leads locaux.', href: '/prospecting', active: true,
  },
  {
    icon: Brain, name: 'Intelligence IA', desc: 'Insights et résumés IA sur vos données commerciales.', href: '/intelligence', active: true,
  },
  {
    icon: BookOpen, name: 'Bibliothèque', desc: 'Gérez vos modèles de documents et ressources.', href: '/library', active: true,
  },
  {
    icon: Wrench, name: 'Services', desc: 'Catalogue de vos offres et services pour les prospects.', href: '/services', active: true,
  },
];

interface UsageStats {
  leadsCount: number;
  agentsCount: number;
  tasksCount: number;
}

interface Props {
  usage?: UsageStats;
}

export function SettingsWorkspaceOverviewSection({ usage }: Props) {
  return (
    <SettingsSectionWrapper
      title="Vue d'ensemble"
      description="Aperçu rapide de votre espace de travail Minerva OS."
      isSaving={false}
    >
      {/* Products grid */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Produits actifs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRODUCTS.map(({ icon: Icon, name, desc, href, active }) => (
            <div key={name} className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#059669]" />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]'}`}>
                  {active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#26251e]">{name}</p>
                <p className="text-[11px] text-[#7a7a76] leading-relaxed mt-0.5">{desc}</p>
              </div>
              <Link href={href} className="flex items-center gap-1 text-[11px] font-semibold text-[#059669] hover:underline">
                Ouvrir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Plan actuel</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#26251e]">Gratuit</p>
            <p className="text-[11px] text-[#7a7a76]">Fonctionnalités de base incluses</p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wide bg-[#059669]/10 text-[#059669] border border-[#059669]/20 px-2 py-0.5 rounded-full">
            Actif
          </span>
        </div>
        <div className="space-y-1.5">
          {['Leads illimités', 'Agents personnalisés', 'Chat IA intégré', 'Prospection automatique'].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" />
              <span className="text-[11px] text-[#26251e]">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-4">Utilisation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Leads', value: usage.leadsCount },
              { label: 'Agents', value: usage.agentsCount },
              { label: 'Tâches', value: usage.tasksCount },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-[#26251e]">{value}</p>
                <p className="text-[10px] text-[#7a7a76] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </SettingsSectionWrapper>
  );
}
