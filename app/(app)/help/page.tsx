'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, PlayCircle, BookOpen, ExternalLink, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HELP_GUIDES } from '@/lib/help-guides';

type HelpTab = 'faq' | 'tutorials' | 'videos';

const FAQ_ITEMS = [
  {
    id: 'what',
    question: 'Qu\'est-ce que Minerva OS Reach Lite ?',
    answer: 'Minerva OS Reach Lite est un outil de prospection locale qui découvre automatiquement des commerces (Google Maps, OSM), génère des audits de site, et produit des emails de prospection personnalisés grâce à l\'IA. Il tourne en application de bureau (Electron) ou dans un navigateur web et synchronise vos données via Supabase.',
  },
  {
    id: 'workspaces',
    question: 'À quoi servent les workspaces ?',
    answer: 'Les workspaces permettent de séparer vos campagnes par client, secteur ou région. Chaque workspace a sa propre liste de leads, tâches et pipelines. Vous pouvez inviter des membres avec des rôles différents (admin, éditeur, lecteur) dans chaque workspace.',
  },
  {
    id: 'scraping',
    question: 'Comment fonctionne le scraping de leads ?',
    answer: 'Le module Prospection envoie une requête à l\'API /api/scrape-maps qui interroge Google Maps (via Places API) ou OpenStreetMap selon votre configuration. Les résultats sont insérés directement dans votre base SQLite locale (Electron) ou Supabase (web) avec le statut "nouveau".',
  },
  {
    id: 'electron',
    question: 'Quelle est la différence entre le mode Electron et le mode Web ?',
    answer: 'En mode Electron (application de bureau), les données sont d\'abord stockées localement dans SQLite sur votre machine, puis synchronisées avec Supabase toutes les 5 minutes. En mode Web, les données sont écrites directement dans Supabase. Le mode Electron fonctionne hors ligne et se synchronise dès que la connexion revient.',
  },
  {
    id: 'sync',
    question: 'Mes données sont-elles sauvegardées si mon PC plante ?',
    answer: 'En mode Electron, SQLite est votre stockage principal. La synchronisation avec Supabase est automatique (toutes les 5 minutes) et s\'effectue aussi à chaque création/modification. Si votre PC plante entre deux syncs, les données présentes dans SQLite et pas encore synchronisées seront renvoyées au prochain démarrage de l\'application.',
  },
  {
    id: 'billing',
    question: 'Comment changer de forfait ?',
    answer: 'Rendez-vous sur la page Facturation (accessible depuis le menu latéral). Cliquez sur "Passer à Équipe" pour initier le changement de forfait. Pour un forfait Entreprise ou une demande sur mesure, cliquez sur "Nous contacter".',
  },
  {
    id: 'email',
    question: 'Comment connecter Gmail pour envoyer des emails depuis Minerva ?',
    answer: 'Allez dans Intégrations → Gmail → "Se connecter". Le flux OAuth Google s\'ouvrira. Une fois autorisé, Minerva peut envoyer des emails depuis votre compte Google via l\'API Gmail. Aucun mot de passe n\'est stocké : seul un token d\'accès sécurisé est conservé.',
  },
  {
    id: 'ai',
    question: 'Quels modèles d\'IA sont utilisés ?',
    answer: 'Minerva OS utilise les modèles Claude d\'Anthropic (via l\'API Anthropic) pour la génération de brouillons d\'emails, les audits de sites et les suggestions d\'actions. Le modèle actuel est claude-sonnet-4-6, qui offre le meilleur équilibre entre qualité et vitesse.',
  },
];

const TUTORIALS = HELP_GUIDES;

const VIDEOS = [
  {
    title: 'Tour d\'horizon de Minerva OS Reach Lite',
    description: 'Vue d\'ensemble des fonctionnalités clés en 4 minutes.',
    duration: '3:42',
    url: '#',
  },
  {
    title: 'Configurer une campagne pour les commerces à Montréal',
    description: 'Demo live d\'une campagne de prospection quartier par quartier.',
    duration: '6:15',
    url: '#',
  },
  {
    title: 'Synchronisation Electron + Supabase expliquée',
    description: 'Comment fonctionne la synchro bidirectionnelle hors ligne / en ligne.',
    duration: '5:00',
    url: '#',
  },
];

const LEVEL_COLORS: Record<string, string> = {
  'Débutant': 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/20',
  'Intermédiaire': 'bg-amber-50 text-amber-700 border-amber-200',
  'Avancé': 'bg-violet-50 text-violet-700 border-violet-200',
};

function FaqItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e5e5e0]/60 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="text-xs font-semibold text-[#26251e]">{item.question}</span>
        <ChevronDown className={cn('h-4 w-4 text-[#7a7a76] shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-[11px] text-[#555552] leading-relaxed pb-4 pr-6">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState<HelpTab>('faq');

  const tabs: { id: HelpTab; label: string }[] = [
    { id: 'faq', label: 'FAQ' },
    { id: 'tutorials', label: 'Tutoriels' },
    { id: 'videos', label: 'Vidéos' },
  ];

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#10b981]" />
              <h1 className="text-base font-bold text-[#26251e]">Centre d'aide</h1>
            </div>
            <p className="text-xs text-[#7a7a76]">
              Trouvez des réponses et apprenez à tirer le meilleur de Minerva OS Reach Lite.
            </p>
          </div>
          <a
            href="mailto:support@minervaos.com"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:border-[#c5c5c0] transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contacter le support
          </a>
        </div>

        {/* Quick links banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BookOpen, label: 'Démarrage rapide', tab: 'tutorials' as HelpTab },
            { icon: HelpCircle, label: 'Questions fréquentes', tab: 'faq' as HelpTab },
            { icon: PlayCircle, label: 'Tutoriels vidéo', tab: 'videos' as HelpTab },
            { icon: Mail, label: 'Support email', tab: null },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.tab && setTab(item.tab)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#10b981]/30 hover:bg-[#10b981]/5 transition-all group text-center"
            >
              <item.icon className="h-5 w-5 text-[#10b981] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-[#555552] group-hover:text-[#26251e] leading-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Tab switcher */}
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

        {/* FAQ */}
        {tab === 'faq' && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white px-5 divide-y-0">
            <div className="pb-3 border-b border-[#e5e5e0]">
              <h2 className="text-sm font-bold text-[#26251e]">Questions fréquentes</h2>
              <p className="text-[11px] text-[#7a7a76] mt-0.5">{FAQ_ITEMS.length} questions</p>
            </div>
            <div>
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Tutorials */}
        {tab === 'tutorials' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">Guides pas à pas</h2>
              <span className="text-[10px] font-semibold text-[#7a7a76]">{TUTORIALS.length} guides</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TUTORIALS.map((tuto) => (
                <div
                  key={tuto.slug}
                  className="rounded-xl border border-[#e5e5e0] bg-white p-4 hover:border-[#10b981]/30 hover:shadow-sm transition-all flex flex-col gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#26251e] leading-snug">{tuto.title}</h3>
                    </div>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed">{tuto.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#7a7a76]">{tuto.duration}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', LEVEL_COLORS[tuto.level])}>
                        {tuto.level}
                      </span>
                    </div>
                    <Link href={`/help/guides/${tuto.slug}`} className="text-[10px] font-bold text-[#059669] hover:text-[#047857] flex items-center gap-1 transition-colors">
                      Voir le guide
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {tab === 'videos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">Tutoriels vidéo</h2>
              <span className="text-[10px] font-semibold text-[#7a7a76]">{VIDEOS.length} vidéos</span>
            </div>
            <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden divide-y divide-[#e5e5e0]/60">
              {VIDEOS.map((video) => (
                <div
                  key={video.title}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#f4f4f3]/40 transition-colors"
                >
                  {/* Thumbnail placeholder */}
                  <div className="shrink-0 w-16 h-10 rounded-md bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#26251e] truncate">{video.title}</p>
                    <p className="text-[11px] text-[#7a7a76] mt-0.5">{video.description}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold text-[#7a7a76]">{video.duration}</span>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-[#059669] hover:text-[#047857] flex items-center gap-1 transition-colors"
                    >
                      Regarder
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact footer card */}
        <div className="rounded-xl border border-[#e5e5e0] bg-[#f4f4f3] p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#26251e]">Vous ne trouvez pas ce que vous cherchez ?</p>
            <p className="text-[11px] text-[#555552]">
              Notre équipe répond généralement en moins de 24h du lundi au vendredi.
            </p>
          </div>
          <a
            href="mailto:support@minervaos.com"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Écrire au support
          </a>
        </div>

      </div>
    </div>
  );
}
