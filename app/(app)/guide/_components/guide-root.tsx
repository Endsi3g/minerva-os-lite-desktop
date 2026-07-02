'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { MinervaOwl } from '@/components/minerva-owl';
import {
  Users, Mail, MapPin, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, ArrowRight, Zap, Target, BookOpen
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Slide {
  mascotState: 'idle' | 'thinking' | 'prospecting' | 'sending' | 'success' | 'connected' | 'analyse' | 'debugging' | 'update';
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
    mascotState: 'idle',
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
    mascotState: 'analyse',
    title: 'Leads & Pipeline',
    subtitle: 'Tes prospects organisés du premier contact au contrat signé.',
    points: [
      { icon: '➕', text: 'Ajoute des leads manuellement ou scrappe-les depuis la Carte.' },
      { icon: '📊', text: 'Suis leur statut : Nouveau → Contacté → RDV → Proposition → Gagné.' },
      { icon: '🗂️', text: 'Visualise ton pipeline en Kanban ou tableau. Drag & drop pour changer de statut.' },
      { icon: '💼', text: 'Chaque fiche lead contient ses notes, emails, tâches et propositions commerciales.' },
    ],
    cta: { label: 'Voir les Leads', href: '/leads' },
  },
  {
    mascotState: 'thinking',
    title: 'Outreach & IA',
    subtitle: "L'IA prospecte pour toi — emails personnalisés en 1 clic.",
    points: [
      { icon: '✍', text: "Ouvre la fiche d'un lead → \"Générer un brouillon\" → email prêt en 5 secondes." },
      { icon: '🧠', text: "L'IA utilise : le site web du prospect, ses avis Google, tes notes terrain." },
      { icon: '📧', text: 'Connecte Gmail pour envoyer directement depuis Minerva (Inbox).' },
      { icon: '⚙️', text: 'Configure ton style commercial dans Paramètres → IA pour des messages encore plus pertinents.' },
    ],
    cta: { label: 'Configurer l\'IA', href: '/settings/ai/setup' },
  },
  {
    mascotState: 'prospecting',
    title: 'Carte & Terrain',
    subtitle: 'Tes clients sont là, dehors. Va les voir.',
    points: [
      { icon: '🗺️', text: 'La Carte affiche tous tes leads géolocalisés avec leurs statuts (couleurs).' },
      { icon: '🚶', text: "Planifie tes tournées de walk-ins : clique sur un lead → note le résultat." },
      { icon: '🔍', text: 'Filtre par statut, score et secteur pour cibler les zones à fort potentiel.' },
      { icon: '📍', text: 'Le bouton \"Planifier des visites\" te mène directement dans le flow Terrain.' },
    ],
    cta: { label: 'Ouvrir la Carte', href: '/map' },
  },
  {
    mascotState: 'success',
    title: 'Gagner avec Minerva',
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
    icon: <Target className="h-4 w-4" />,
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
    <div className="min-h-full bg-[#fbfbfa] flex flex-col relative overflow-y-auto">
      {/* Premium background grid */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      {/* Top thin progress indicator bar (slides phase) */}
      {phase === 'slides' && (
        <div className="h-1 bg-[#e6e6e2] w-full z-10 shrink-0">
          <motion.div
            className="h-full bg-[#059669]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16 relative z-10">
        <AnimatePresence mode="wait" initial={false}>

          {phase === 'slides' && (
            <motion.div
              key={`slide-${slideIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-xl"
            >
              {/* Premium Minimalist Card */}
              <div className="bg-white/85 backdrop-blur-md rounded-[32px] border border-[#e6e6e2] shadow-[0_24px_50px_-12px_rgba(38,37,30,0.06)] overflow-hidden flex flex-col">
                
                {/* Mascot Frame */}
                <div className="pt-10 pb-4 flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-4">
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 rounded-full bg-[#059669]/5 animate-ping opacity-60" />
                    {/* Dashed outer border */}
                    <div className="absolute inset-0 rounded-full border border-[#e6e6e2] border-dashed" />
                    {/* Mascot */}
                    <div className="w-20 h-20 relative z-10">
                      <MinervaOwl state={slide.mascotState} />
                    </div>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#26251e] px-6">
                    {slide.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#7a7a76] font-medium max-w-sm mt-1.5 px-6">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Points list */}
                <div className="px-6 sm:px-8 py-4 space-y-3">
                  {slide.points.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#fafaf8] border border-[#f0f0ed] hover:border-[#059669]/20 hover:bg-[#059669]/[0.02] transition-all group"
                    >
                      <span className="text-base shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        {point.icon}
                      </span>
                      <p className="text-xs sm:text-sm text-[#26251e] leading-relaxed font-medium">
                        {point.text}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Optional CTA */}
                {slide.cta && (
                  <div className="px-6 sm:px-8 pb-3 text-center">
                    <Link
                      href={slide.cta.href}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-[#047857] transition-all bg-[#059669]/5 hover:bg-[#059669]/10 px-3 py-1.5 rounded-full"
                    >
                      {slide.cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {/* Nav footer */}
                <div className="px-6 sm:px-8 py-5 border-t border-[#f0f0ed] flex items-center justify-between mt-4">
                  {/* Dots */}
                  <div className="flex items-center gap-2">
                    {SLIDES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === slideIndex
                            ? 'w-5 h-2 bg-[#059669]'
                            : 'w-2 h-2 bg-[#e6e6e2] hover:bg-[#c5c5c0]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {slideIndex > 0 && (
                      <button
                        onClick={prevSlide}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f0f0ed] transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </button>
                    )}
                    <button
                      onClick={nextSlide}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow active:scale-95"
                      style={{ backgroundColor: '#059669' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#047857')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#059669')}
                    >
                      {slideIndex < SLIDES.length - 1 ? (
                        <>
                          Suivant
                          <ChevronRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Passer à l&apos;action
                          <Zap className="h-4 w-4 animate-pulse" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center text-[10px] sm:text-xs text-[#b0b0aa] font-semibold mt-5">
                Slide {slideIndex + 1} de {SLIDES.length}
              </p>
            </motion.div>
          )}

          {phase === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-3">
                  <div className="absolute inset-0 rounded-full border border-[#059669]/15 border-dashed animate-spin-slow" />
                  <div className="w-16 h-16">
                    <MinervaOwl state={allDone ? 'success' : 'idle'} />
                  </div>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-[#26251e]">À toi de jouer</h1>
                <p className="text-xs sm:text-sm text-[#7a7a76] font-medium mt-1">
                  6 actions simples pour configurer ton espace et démarrer.
                </p>
              </div>

              {/* Minimalist Progress track */}
              <div className="mb-6 bg-white/70 backdrop-blur-md rounded-2xl border border-[#e6e6e2] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#26251e] mb-2">
                  <span>{checked.size} / {CHECK_ITEMS.length} complétées</span>
                  <span className="text-[#059669]">{Math.round((checked.size / CHECK_ITEMS.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#f0f0ed] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#059669]"
                    animate={{ width: `${(checked.size / CHECK_ITEMS.length) * 100}%` }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>

              {/* Interactive Checklist list */}
              <div className="space-y-2.5 mb-6">
                {CHECK_ITEMS.map((item, i) => {
                  const done = checked.has(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        done
                          ? 'bg-[#f0faf6]/80 border-[#059669]/20 shadow-none'
                          : 'bg-white/85 border-[#e6e6e2] hover:border-[#059669]/40 shadow-[0_4px_12px_rgba(38,37,30,0.01)] hover:shadow-[0_8px_20px_rgba(38,37,30,0.03)]'
                      }`}
                    >
                      {/* Check box toggle */}
                      <button
                        onClick={() => toggleCheck(item.id)}
                        className="shrink-0 transition-transform active:scale-95"
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                        ) : (
                          <Circle className="h-5 w-5 text-[#c5c5c0] hover:text-[#059669] transition-colors" />
                        )}
                      </button>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-bold transition-all ${
                            done ? 'line-through text-[#807d72]' : 'text-[#26251e]'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-[10px] sm:text-xs text-[#7a7a76] font-medium mt-0.5 truncate">
                          {item.description}
                        </p>
                      </div>

                      {/* Time info */}
                      <span className="text-[10px] text-[#7a7a76] bg-[#f0f0ed] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {item.time}
                      </span>

                      {/* Navigate button */}
                      <Link
                        href={item.href}
                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-[#f0f0ed] hover:bg-[#059669] hover:text-white text-[#7a7a76] transition-all active:scale-95"
                        title={`Accéder à : ${item.label}`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Controls Footer */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setPhase('slides');
                    setSlideIndex(4);
                  }}
                  className="text-xs font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Revoir les slides
                </button>

                <button
                  onClick={finish}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                    allDone ? 'shadow-md scale-105 bg-[#059669]' : 'bg-[#26251e] hover:bg-neutral-800'
                  }`}
                  style={allDone ? { backgroundColor: '#059669' } : {}}
                >
                  {allDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      C&apos;est parti !
                    </>
                  ) : (
                    <>
                      Accéder au Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {allDone && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-[#059669] font-bold mt-4"
                >
                  🎉 Félicitations ! Tu es fin prêt(e) pour prospecter.
                </motion.p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Slide skip action button */}
      {phase === 'slides' && (
        <div className="pb-6 text-center relative z-10 shrink-0">
          <button
            onClick={() => setPhase('checklist')}
            className="text-xs font-bold text-[#b0b0aa] hover:text-[#7a7a76] transition-colors"
          >
            Passer l&apos;introduction →
          </button>
        </div>
      )}
    </div>
  );
}
