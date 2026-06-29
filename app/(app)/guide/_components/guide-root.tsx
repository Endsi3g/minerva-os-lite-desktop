'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import {
  Sparkles, Users, Mail, MapPin, TrendingUp, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, ArrowRight, Zap, Target, DollarSign, BookOpen,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Slide {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  points: { icon: string; text: string }[];
  cta?: { label: string; href: string };
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  time: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-white" />,
    color: '#059669',
    title: 'Bienvenue sur Minerva',
    subtitle: 'Ton système de vente terrain — maîtrisé en 10 minutes.',
    points: [
      { icon: '🎯', text: 'Prospecte des PME locales qui ont besoin de visibilité digitale.' },
      { icon: '🤖', text: "L'IA génère des emails ultra-personnalisés à ta place." },
      { icon: '💰', text: 'Objectif : 1 contrat signé par semaine, dès ta première tournée.' },
      { icon: '⏱️', text: 'Ce guide : 5 slides + 6 actions concrètes. Durée : ~10 minutes.' },
    ],
  },
  {
    icon: <Users className="h-10 w-10 text-white" />,
    color: '#2563eb',
    title: 'Leads & Pipeline',
    subtitle: 'Tes prospects organisés du premier contact au contrat signé.',
    points: [
      { icon: '➕', text: 'Ajoute des leads manuellement ou scrappe-les depuis la Carte (Google Maps / OpenStreetMap).' },
      { icon: '📊', text: 'Suis leur statut : Nouveau → Contacté → RDV → Proposition → Gagné.' },
      { icon: '🗂️', text: 'Visualise ton pipeline en Kanban ou tableau. Drag & drop pour changer de statut.' },
      { icon: '💼', text: 'Chaque fiche lead contient ses notes, emails, tâches et propositions commerciales.' },
    ],
    cta: { label: 'Voir les Leads', href: '/leads' },
  },
  {
    icon: <Mail className="h-10 w-10 text-white" />,
    color: '#7c3aed',
    title: 'Outreach & IA',
    subtitle: "L'IA prospecte pour toi — emails personnalisés en 1 clic.",
    points: [
      { icon: '✍️', text: "Ouvre la fiche d'un lead → \"Générer un brouillon\" → email prêt en 5 secondes." },
      { icon: '🧠', text: "L'IA utilise : le site web du prospect, ses avis Google, tes notes terrain." },
      { icon: '📧', text: 'Connecte Gmail pour envoyer directement depuis Minerva (Inbox).' },
      { icon: '⚙️', text: 'Configure ton style commercial dans Paramètres → IA pour des messages encore plus pertinents.' },
    ],
    cta: { label: 'Configurer l\'IA', href: '/settings/ai/setup' },
  },
  {
    icon: <MapPin className="h-10 w-10 text-white" />,
    color: '#d97706',
    title: 'Carte & Terrain',
    subtitle: 'Tes clients sont là, dehors. Va les voir.',
    points: [
      { icon: '🗺️', text: 'La Carte affiche tous tes leads géolocalisés avec leurs statuts (couleurs).' },
      { icon: '🚶', text: "Planifie tes tournées de walk-ins : clique sur un lead → ouvre sa fiche → note le résultat." },
      { icon: '🔍', text: 'Filtre par statut, score et secteur pour cibler les zones à fort potentiel.' },
      { icon: '📍', text: 'Le bouton \"Planifier des visites\" te mène directement dans le flow Terrain.' },
    ],
    cta: { label: 'Ouvrir la Carte', href: '/map' },
  },
  {
    icon: <DollarSign className="h-10 w-10 text-white" />,
    color: '#059669',
    title: 'Gagner de l\'argent avec Minerva',
    subtitle: 'De la prospection au contrat en 48h — voici le process.',
    points: [
      { icon: '1️⃣', text: 'Scrape → Ajoute 10-20 leads depuis la Carte (restaurants, salons, cliniques…).' },
      { icon: '2️⃣', text: 'Génère → Laisse l\'IA écrire un email percutant pour chacun. Envoie en lot.' },
      { icon: '3️⃣', text: 'RDV → Ceux qui répondent : planifie un appel ou une visite depuis Agenda.' },
      { icon: '4️⃣', text: 'Propose → Génère une proposition commerciale multi-sections depuis la fiche lead. Signe.' },
    ],
  },
];

const CHECK_ITEMS: CheckItem[] = [
  {
    id: 'add_leads',
    label: 'Ajoute tes 5 premiers leads',
    description: 'Depuis la page Leads (bouton +) ou en scrapant depuis la Carte.',
    href: '/leads',
    icon: <Users className="h-4 w-4" />,
    time: '3 min',
  },
  {
    id: 'generate_email',
    label: 'Génère ton premier email IA',
    description: 'Ouvre la fiche d\'un lead → onglet Outreach → Générer un brouillon.',
    href: '/leads',
    icon: <Mail className="h-4 w-4" />,
    time: '2 min',
  },
  {
    id: 'configure_ai',
    label: 'Configure ton assistant IA',
    description: 'Réponds à 8 questions pour que l\'IA écrive dans ton style.',
    href: '/settings/ai/setup',
    icon: <Sparkles className="h-4 w-4" />,
    time: '5 min',
  },
  {
    id: 'connect_gmail',
    label: 'Connecte Gmail',
    description: 'Reçois et réponds aux emails de tes prospects directement dans Minerva.',
    href: '/inbox',
    icon: <Mail className="h-4 w-4" />,
    time: '1 min',
  },
  {
    id: 'open_map',
    label: 'Explore ta Carte',
    description: 'Vois tes leads géolocalisés et planifie ta première tournée.',
    href: '/map',
    icon: <MapPin className="h-4 w-4" />,
    time: '2 min',
  },
  {
    id: 'view_pipeline',
    label: 'Explore ton Pipeline',
    description: 'Visualise tes deals en Kanban — glisse un lead vers "Proposition envoyée".',
    href: '/pipeline',
    icon: <Target className="h-4 w-4" />,
    time: '1 min',
  },
];

const STORAGE_KEY_SEEN = 'minerva_guide_seen';
const STORAGE_KEY_CHECKLIST = 'minerva_guide_checklist';

// ── Component ──────────────────────────────────────────────────────────────────

export function GuideRoot() {
  const router = useRouter();
  const [phase, setPhase] = useState<'slides' | 'checklist'>('slides');
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SEEN, '1');
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_CHECKLIST) || '[]') as string[];
      setChecked(new Set(saved));
    } catch {
      // ignore
    }
  }, []);

  function goToSlide(index: number) {
    setDirection(index > slideIndex ? 1 : -1);
    setSlideIndex(index);
  }

  function nextSlide() {
    if (slideIndex < SLIDES.length - 1) {
      goToSlide(slideIndex + 1);
    } else {
      setPhase('checklist');
    }
  }

  function prevSlide() {
    if (slideIndex > 0) goToSlide(slideIndex - 1);
  }

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify([...next]));
      return next;
    });
  }

  function finish() {
    router.push('/today');
  }

  const slide = SLIDES[slideIndex];
  const progress = ((slideIndex + 1) / SLIDES.length) * 100;
  const allDone = CHECK_ITEMS.every(item => checked.has(item.id));

  return (
    <div className="min-h-full bg-[#f7f7f5] flex flex-col">

      {/* Top progress bar (slides phase) */}
      {phase === 'slides' && (
        <div className="h-1 bg-[#e5e5e0] w-full">
          <motion.div
            className="h-full bg-[#059669]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait" initial={false}>

          {phase === 'slides' && (
            <motion.div
              key={`slide-${slideIndex}`}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-2xl"
            >
              {/* Slide card */}
              <div className="bg-white rounded-3xl border border-[#e5e5e0] shadow-sm overflow-hidden">
                {/* Header band */}
                <div
                  className="px-8 pt-8 pb-6 flex flex-col items-center text-center"
                  style={{ background: `linear-gradient(135deg, ${slide.color}18 0%, ${slide.color}08 100%)` }}
                >
                  <div
                    className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                    style={{ backgroundColor: slide.color }}
                  >
                    {slide.icon}
                  </div>
                  <h1 className="text-2xl font-bold text-[#26251e] mb-1">{slide.title}</h1>
                  <p className="text-sm text-[#7a7a76] max-w-md">{slide.subtitle}</p>
                </div>

                {/* Points */}
                <div className="px-8 py-6 space-y-3">
                  {slide.points.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 + 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#f7f7f5]"
                    >
                      <span className="text-base shrink-0 mt-0.5">{point.icon}</span>
                      <p className="text-sm text-[#26251e] leading-relaxed">{point.text}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Optional CTA */}
                {slide.cta && (
                  <div className="px-8 pb-4">
                    <Link
                      href={slide.cta.href}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#047857] transition-colors"
                    >
                      {slide.cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {/* Nav footer */}
                <div className="px-8 py-5 border-t border-[#e5e5e0] flex items-center justify-between">
                  {/* Dots */}
                  <div className="flex items-center gap-1.5">
                    {SLIDES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`rounded-full transition-all ${i === slideIndex ? 'w-5 h-2 bg-[#059669]' : 'w-2 h-2 bg-[#e5e5e0] hover:bg-[#c5c5c0]'}`}
                      />
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {slideIndex > 0 && (
                      <button
                        onClick={prevSlide}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f0f0ed] transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </button>
                    )}
                    <button
                      onClick={nextSlide}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                      style={{ backgroundColor: '#059669' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#047857')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#059669')}
                    >
                      {slideIndex < SLIDES.length - 1 ? (
                        <>Suivant <ChevronRight className="h-4 w-4" /></>
                      ) : (
                        <>Passer à l&apos;action <Zap className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-[#b0b0aa] mt-4">
                {slideIndex + 1} / {SLIDES.length} — Tu peux naviguer librement entre les slides
              </p>
            </motion.div>
          )}

          {phase === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-2xl"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#059669] mb-3 shadow-sm">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-[#26251e]">À toi de jouer</h1>
                <p className="text-sm text-[#7a7a76] mt-1">6 actions pour maîtriser Minerva et faire tes premiers euros.</p>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-[#7a7a76] mb-1.5">
                  <span>{checked.size} / {CHECK_ITEMS.length} complétées</span>
                  <span>{Math.round((checked.size / CHECK_ITEMS.length) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#e5e5e0] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#059669]"
                    animate={{ width: `${(checked.size / CHECK_ITEMS.length) * 100}%` }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-6">
                {CHECK_ITEMS.map((item, i) => {
                  const done = checked.has(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${done ? 'bg-[#f0faf6] border-[#059669]/30' : 'bg-white border-[#e5e5e0] hover:border-[#c5c5c0]'}`}
                    >
                      {/* Check toggle */}
                      <button
                        onClick={() => toggleCheck(item.id)}
                        className="shrink-0 transition-transform hover:scale-110"
                      >
                        {done
                          ? <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                          : <Circle className="h-5 w-5 text-[#c5c5c0]" />
                        }
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${done ? 'line-through text-[#7a7a76]' : 'text-[#26251e]'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-[#7a7a76] mt-0.5">{item.description}</p>
                      </div>

                      {/* Time badge */}
                      <span className="text-xs text-[#7a7a76] bg-[#f0f0ed] px-2 py-0.5 rounded-full font-medium shrink-0">
                        {item.time}
                      </span>

                      {/* Link */}
                      <Link
                        href={item.href}
                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-[#f0f0ed] hover:bg-[#059669] hover:text-white text-[#7a7a76] transition-colors"
                        title={`Aller vers ${item.label}`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setPhase('slides'); setSlideIndex(4); }}
                  className="text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Revoir les slides
                </button>

                <button
                  onClick={finish}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${allDone ? 'shadow-md scale-105' : ''}`}
                  style={{ backgroundColor: '#059669' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#047857')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#059669')}
                >
                  {allDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      C&apos;est parti !
                    </>
                  ) : (
                    <>
                      Accéder à l&apos;app
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {allDone && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-[#059669] font-semibold mt-3"
                >
                  🎉 Tu es prêt(e) ! Bonne prospection.
                </motion.p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Skip link */}
      {phase === 'slides' && (
        <div className="pb-4 text-center">
          <button
            onClick={() => setPhase('checklist')}
            className="text-xs text-[#b0b0aa] hover:text-[#7a7a76] transition-colors"
          >
            Passer les slides →
          </button>
        </div>
      )}
    </div>
  );
}
