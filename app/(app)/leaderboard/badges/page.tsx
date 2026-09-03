'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Trophy,
  Coins,
  Zap,
  Target,
  Bot,
  MapPin,
  Sparkles,
  CheckCircle2,
  Lock,
  Search,
  Users,
  Award,
  TrendingUp,
  Shield,
  Clock,
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { AnalyserSubNav } from '@/app/(app)/_components/hub-nav/analyser-sub-nav';

interface BadgeDefinition {
  id: string;
  title: string;
  category: 'sales' | 'outreach' | 'ai' | 'field';
  tier: 'Bronze' | 'Argent' | 'Or' | 'Platine' | 'Diamant';
  tierColor: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  criteria: string;
  targetValue: number;
  unit: string;
}

const ALL_BADGES: BadgeDefinition[] = [
  {
    id: 'deal-100',
    title: 'Bonus 1er Deal (100% Commission)',
    category: 'sales',
    tier: 'Or',
    tierColor: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: Coins,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    description: 'Bonus exceptionnel versé intégralement sur le tout premier contrat signé par un commercial.',
    criteria: 'Clôturer et signer au moins 1 contrat client avec statut Gagné.',
    targetValue: 1,
    unit: 'deal signé',
  },
  {
    id: 'top-closer',
    title: 'Top Closer',
    category: 'sales',
    tier: 'Platine',
    tierColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    icon: Trophy,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    description: 'Démontre une capacité de concrétisation et de signature commerciale supérieure.',
    criteria: 'Signer 2 contrats ou plus au sein de la même période de prospection.',
    targetValue: 2,
    unit: 'deals signés',
  },
  {
    id: 'rdv-machine',
    title: 'Machine à RDV',
    category: 'outreach',
    tier: 'Argent',
    tierColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    icon: Zap,
    iconColor: 'text-[#059669]',
    iconBg: 'bg-emerald-100',
    description: 'Rythme de conversion soutenu : enchaînement de rendez-vous qualifiés et démonstrations.',
    criteria: 'Planifier 4 rendez-vous clients ou démonstrations en statut RDV fixé.',
    targetValue: 4,
    unit: 'RDV fixés',
  },
  {
    id: 'sniper',
    title: 'Sniper de Conversion',
    category: 'outreach',
    tier: 'Argent',
    tierColor: 'bg-blue-50 text-blue-900 border-blue-200',
    icon: Target,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    description: 'Ciblage ultra-précis minimisant le déchet et maximisant le taux de réponse.',
    criteria: 'Atteindre un taux de conversion supérieur ou égal à 20% sur les leads contactés.',
    targetValue: 20,
    unit: '% taux de conversion',
  },
  {
    id: 'team-challenge-master',
    title: 'Pionnier du Défi 5 Clients',
    category: 'sales',
    tier: 'Diamant',
    tierColor: 'bg-cyan-50 text-cyan-900 border-cyan-300',
    icon: Sparkles,
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-100',
    description: 'Contribution collective décisive pour franchir le palier des 5 clients et débloquer la cagnotte.',
    criteria: 'Atteindre ensemble 5 clients signés durant le premier mois d\'activité.',
    targetValue: 5,
    unit: 'clients signés en équipe',
  },
  {
    id: 'field-explorer',
    title: 'Explorateur Terrain GPS',
    category: 'field',
    tier: 'Bronze',
    tierColor: 'bg-orange-50 text-orange-900 border-orange-200',
    icon: MapPin,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    description: 'Prospection physique et immersion terrain pour aller directement à la rencontre des commerces.',
    criteria: 'Ajouter au moins 3 étapes dans une tournée commerciale sur la Carte Live.',
    targetValue: 3,
    unit: 'points d\'arrêt',
  },
  {
    id: 'autonomous-ai',
    title: '24/7 Autonome',
    category: 'ai',
    tier: 'Or',
    tierColor: 'bg-purple-50 text-purple-900 border-purple-200',
    icon: Bot,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    description: 'Déploiement de l\'agent commercial IA pour qualifier et enrichir les prospects en continu.',
    criteria: 'Activer l\'Agent Minerva SDR sur le workspace de prospection.',
    targetValue: 1,
    unit: 'agent actif',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous les Succès' },
  { id: 'sales', label: 'Ventes & Revenus' },
  { id: 'outreach', label: 'Prospection & RDV' },
  { id: 'field', label: 'Terrain & Carte' },
  { id: 'ai', label: 'Automatisation IA' },
];

export default function LeaderboardBadgesPage() {
  const { leads } = useReach();
  const searchParams = useSearchParams();
  const highlightedBadgeId = searchParams?.get('badge');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Real stats calculation
  const wonCount = leads.filter(l => l.status === 'Won').length;
  const bookedCount = leads.filter(l => ['Call Booked', 'Demo', 'Proposal', 'Meeting Booked'].includes(l.status)).length;
  const contactedCount = leads.filter(l => l.status !== 'New').length;
  const conversionRate = contactedCount > 0 ? Math.round(((bookedCount + wonCount) / contactedCount) * 100) : 0;

  // Evaluate badge progress and unlocked status for current team
  const badgesWithStatus = useMemo(() => {
    return ALL_BADGES.map(badge => {
      let currentVal = 0;
      let unlocked = false;
      let unlockedBy: { name: string; role: string; date: string }[] = [];

      switch (badge.id) {
        case 'deal-100':
          currentVal = wonCount;
          unlocked = wonCount >= 1;
          if (unlocked) {
            unlockedBy.push({ name: 'Kael Belceus', role: 'Fondateur / Head of Sales', date: 'Cette semaine' });
          }
          break;
        case 'top-closer':
          currentVal = wonCount;
          unlocked = wonCount >= 2;
          if (unlocked) {
            unlockedBy.push({ name: 'Kael Belceus', role: 'Fondateur / Head of Sales', date: 'Cette semaine' });
          }
          break;
        case 'rdv-machine':
          currentVal = bookedCount;
          unlocked = bookedCount >= 4;
          if (unlocked) {
            unlockedBy.push({ name: 'Kael Belceus', role: 'Fondateur / Head of Sales', date: 'Cette semaine' });
            unlockedBy.push({ name: 'Minerva AI SDR', role: 'Autonomous AI', date: 'Cette semaine' });
          }
          break;
        case 'sniper':
          currentVal = conversionRate;
          unlocked = conversionRate >= 20;
          if (unlocked) {
            unlockedBy.push({ name: 'Kael Belceus', role: 'Fondateur / Head of Sales', date: 'Cette semaine' });
            unlockedBy.push({ name: 'Minerva AI SDR', role: 'Autonomous AI', date: 'Cette semaine' });
          }
          break;
        case 'team-challenge-master':
          currentVal = Math.min(5, wonCount);
          unlocked = wonCount >= 5;
          break;
        case 'field-explorer':
          currentVal = Math.min(3, leads.length > 0 ? 3 : 0);
          unlocked = leads.length >= 3;
          if (unlocked) {
            unlockedBy.push({ name: 'Kael Belceus', role: 'Fondateur / Head of Sales', date: 'Récemment' });
          }
          break;
        case 'autonomous-ai':
          currentVal = 1;
          unlocked = true;
          unlockedBy.push({ name: 'Minerva AI SDR', role: 'Autonomous Agent', date: 'Actif 24/7' });
          break;
        default:
          break;
      }

      const progressPercent = Math.min(100, Math.round((currentVal / badge.targetValue) * 100));

      return {
        ...badge,
        currentVal,
        unlocked,
        progressPercent,
        unlockedBy,
      };
    });
  }, [leads, wonCount, bookedCount, contactedCount, conversionRate]);

  const filteredBadges = useMemo(() => {
    return badgesWithStatus.filter(b => {
      const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.criteria.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [badgesWithStatus, selectedCategory, searchQuery]);

  const totalUnlocked = badgesWithStatus.filter(b => b.unlocked).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8] text-[#111827]">
      <AnalyserSubNav />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Top Bar Navigation & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e5e5e0] pb-5">
            <div>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour au Leaderboard
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                  <Award className="h-5 w-5 text-[#059669]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                    Palmarès & Succès Commerciaux
                  </h1>
                  <p className="text-xs text-[#6B7280]">
                    Catalogue officiel des badges de performance et critères de déblocage de l'équipe
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5e5e0] shadow-xs text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                <span>
                  <strong className="text-[#059669] font-black">{totalUnlocked}</strong> / {ALL_BADGES.length} débloqués
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#059669]/10 text-[#059669] border border-[#059669]/20 text-xs font-black">
                <span>{Math.round((totalUnlocked / ALL_BADGES.length) * 100)}% de complétion</span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category tabs */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-[#e5e5e0] bg-white p-1 overflow-x-auto shrink-0 shadow-2xs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                    selectedCategory === cat.id
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#fafaf8]'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un succès…"
                className="w-full h-8.5 pl-9 pr-3 rounded-xl bg-white border border-[#e5e5e0] text-xs font-medium text-[#111827] placeholder:text-[#7a7a76] outline-none focus:ring-1 focus:ring-[#059669] shadow-2xs"
              />
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map(badge => {
              const Icon = badge.icon;
              const isTargeted = highlightedBadgeId === badge.id;

              return (
                <div
                  key={badge.id}
                  id={badge.id}
                  className={cn(
                    'rounded-2xl border bg-white p-5 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group',
                    badge.unlocked
                      ? 'border-[#e5e5e0] hover:border-[#059669]/40 hover:shadow-md'
                      : 'border-[#e5e5e0]/60 opacity-80 bg-white/70',
                    isTargeted && 'ring-2 ring-[#059669] border-[#059669] shadow-lg'
                  )}
                >
                  {/* Top Bar: Icon + Tier + Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center border shadow-2xs shrink-0', badge.iconBg, 'border-white')}>
                        <Icon className={cn('h-5 w-5', badge.iconColor)} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border', badge.tierColor)}>
                          {badge.tier}
                        </span>
                        {badge.unlocked ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Débloqué
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <Lock className="h-3 w-3" /> En cours
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-black text-[#111827] leading-tight mb-1 group-hover:text-[#059669] transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed mb-3">
                      {badge.description}
                    </p>

                    {/* Criteria box */}
                    <div className="p-2.5 rounded-xl bg-[#fafaf8] border border-[#e5e5e0]/70 text-[11px] text-[#4a4a45] space-y-1 mb-4">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76]">
                        Condition d'obtention :
                      </p>
                      <p className="font-semibold text-[#26251e]">
                        {badge.criteria}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Progress & Earners */}
                  <div className="space-y-3 pt-2 border-t border-[#f4f4f3]">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-[#7a7a76]">Progression</span>
                        <span className="text-[#26251e]">
                          {badge.currentVal} / {badge.targetValue} {badge.unit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#f0f0ec] overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', badge.unlocked ? 'bg-[#059669]' : 'bg-amber-500')}
                          style={{ width: `${badge.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Unlocked By Members */}
                    {badge.unlockedBy.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76] mb-1.5">
                          Détenu par :
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {badge.unlockedBy.map((m, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50/80 border border-emerald-200/60 text-[10px] font-bold text-[#065F46]"
                              title={`${m.name} (${m.role}) — ${m.date}`}
                            >
                              <div className="w-3.5 h-3.5 rounded-full bg-[#059669] text-white text-[8px] flex items-center justify-center font-black">
                                {m.name.charAt(0)}
                              </div>
                              <span>{m.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBadges.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border border-[#e5e5e0] p-6">
              <Award className="h-8 w-8 text-[#a3a197] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#26251e]">Aucun succès trouvé</p>
              <p className="text-xs text-[#7a7a76] mt-0.5">Essayez avec un autre mot-clé ou filtre de catégorie.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
