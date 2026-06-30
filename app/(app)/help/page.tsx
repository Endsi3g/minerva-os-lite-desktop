'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, PlayCircle, BookOpen, ExternalLink, Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HELP_GUIDES } from '@/lib/help-guides';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';

type HelpTab = 'faq' | 'tutorials' | 'videos' | 'contact';

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

const CONTACT_CATEGORIES = [
  { value: 'bug', label: '🐛 Bug / Problème technique' },
  { value: 'feature', label: '✨ Demande de fonctionnalité' },
  { value: 'billing', label: '💳 Facturation / Abonnement' },
  { value: 'account', label: '👤 Compte / Accès' },
  { value: 'other', label: '💬 Autre' },
] as const;

export default function HelpPage() {
  useEffect(() => { document.title = 'Aide — Minerva'; }, []);
  const { user } = useReach();
  const [tab, setTab] = useState<HelpTab>('faq');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCategory, setContactCategory] = useState<string>('bug');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    setContactError('');
    try {
      const categoryLabel = CONTACT_CATEGORIES.find(c => c.value === contactCategory)?.label ?? contactCategory;
      const res = await fetch(getApiUrl('/api/support/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail || user?.email || '',
          subject: `[${categoryLabel}] ${contactSubject}`,
          message: contactMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      // If SMTP not configured, message was logged server-side only — inform the user
      if (data.note === 'logged') {
        setContactError('Message reçu, mais aucun fournisseur email n\'est configuré côté serveur. Contactez directement : support@minervaos.com');
        setContactSending(false);
        return;
      }
      setContactSuccess(true);
      setContactName(''); setContactEmail(''); setContactSubject(''); setContactMessage('');
    } catch (err: any) {
      setContactError(err.message || 'Erreur lors de l\'envoi. Réessayez plus tard.');
    } finally {
      setContactSending(false);
    }
  };

  const tabs: { id: HelpTab; label: string }[] = [
    { id: 'faq', label: 'FAQ' },
    { id: 'tutorials', label: 'Tutoriels' },
    { id: 'videos', label: 'Vidéos' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="flex flex-col gap-6 p-3 sm:p-4 md:p-6 w-full">

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
          <button
            onClick={() => setTab('contact')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:border-[#c5c5c0] transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contacter le support
          </button>
        </div>

        {/* Quick links banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BookOpen, label: 'Démarrage rapide', tab: 'tutorials' as HelpTab },
            { icon: HelpCircle, label: 'Questions fréquentes', tab: 'faq' as HelpTab },
            { icon: PlayCircle, label: 'Tutoriels vidéo', tab: 'videos' as HelpTab },
            { icon: Mail, label: 'Support email', tab: 'contact' as HelpTab },
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
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-[#c8c6be]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#26251e]">Tutoriels vidéo à venir</p>
              <p className="text-[11px] text-[#7a7a76] mt-1 leading-relaxed">
                Nos tutoriels vidéo sont en cours de production. En attendant, consultez les guides écrits dans l&apos;onglet Tutoriels.
              </p>
            </div>
          </div>
        )}

        {/* Contact Form Tab */}
        {tab === 'contact' && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#26251e]">Contacter le support</h2>
              <p className="text-[11px] text-[#7a7a76] mt-0.5">Notre équipe répond en moins de 24h du lundi au vendredi.</p>
            </div>
            {contactSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-[#10b981]" />
                <p className="text-sm font-bold text-[#26251e]">Message envoyé !</p>
                <p className="text-xs text-[#7a7a76]">Nous vous répondrons dans les plus brefs délais.</p>
                <button
                  onClick={() => setContactSuccess(false)}
                  className="text-xs text-[#10b981] hover:underline font-semibold"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Email de réponse</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Catégorie</label>
                  <select
                    value={contactCategory}
                    onChange={(e) => setContactCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white"
                  >
                    {CONTACT_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sujet</label>
                  <input
                    type="text"
                    required
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Problème avec la synchronisation des leads..."
                    className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Message</label>
                  <textarea
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Décrivez votre problème ou votre question en détail..."
                    className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white h-32 resize-none"
                  />
                </div>
                {contactError && (
                  <p className="text-xs text-red-600 font-semibold">{contactError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contactSending}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors disabled:opacity-60"
                  >
                    {contactSending ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> Envoyer le message</>
                    )}
                  </button>
                </div>
              </form>
            )}
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
          <button
            onClick={() => setTab('contact')}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Écrire au support
          </button>
        </div>

      </div>
    </div>
  );
}
